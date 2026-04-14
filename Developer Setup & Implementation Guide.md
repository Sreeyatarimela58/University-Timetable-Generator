University Timetable Generator: Developer Setup & Implementation Guide

This guide defines the architecture, setup, and implementation requirements for the University Timetable Generator. It enforces a strict separation of concerns between the MERN stack (orchestration and state) and the SWI-Prolog engine (combinatorial optimization).

Read this document thoroughly. Deviation from this architecture will result in race conditions, combinatorial explosions, or integration failures.

1. Project Overview

Timetabling is an NP-Hard combinatorial problem. Node.js is designed for asynchronous I/O and network operations; it is fundamentally incapable of efficiently traversing a massive multidimensional search space. Prolog, specifically Constraint Logic Programming over Finite Domains (CLP(FD)), is mathematically optimized to prune invalid search trees instantly.

Architecture:

MERN App (Orchestrator): Handles database persistence, UI, data validation, and aggregation. It acts as the manager.

Prolog (Stateless Solver): Executes pure mathematical constraint logic. It acts as the worker.

Integration: Node generates a temporary Prolog fact file (.pl), executes the SWI-Prolog binary via a child process, captures the standard output (stdout) as JSON, stores the result, and terminates the worker.

2. Prerequisites (Windows Environment)

You must install specific versions of the runtime environments to ensure CLP(FD) and Node sub-processes execute deterministically. This guide assumes a Windows-based development environment.

Node.js: v18.x LTS or higher.

Download the Windows Installer (.msi) from nodejs.org.

Ensure "Add to PATH" is checked during installation.

MongoDB Atlas: * Create a free cluster at mongodb.com/cloud/atlas.

Ensure your current IP address is added to the Atlas Network Access allowlist.

SWI-Prolog: v8.0.0 or higher.

Download the Windows executable from swi-prolog.org.

Critical: During installation, you MUST check the box to add SWI-Prolog to the system PATH. If omitted, Node's child_process.spawn will fail with ENOENT.

Package Manager: npm (included with Node.js).

Version Control: Git for Windows.

3. Project Folder Structure

Strict physical separation is required. Node and Prolog have different lifecycles and deployment requirements. Do not mix their source code.

/timetable-system
├── /mern-app
│   ├── /client          # React SPA
│   ├── /server
│   │   ├── /src
│   │   │   ├── /models      # Mongoose schemas
│   │   │   ├── /controllers # DB aggregation and logic
│   │   │   ├── /services    # Child process execution layer
│   │   │   └── index.js     # Express entry point
│   │   ├── /tmp             # Temporary directory for generated .pl files
│   │   └── .env             # Environment variables
│   └── package.json     # Must include "type": "module"
└── /prolog-engine
    ├── solver.pl        # Main entry point and CLI handler
    ├── domain.pl        # Maps facts to CLP(FD) domain variables
    ├── constraints.pl   # Hard constraint definitions
    ├── heuristics.pl    # Soft constraint scoring definitions
    ├── output.pl        # JSON serialization via library(http/json)
    └── /tests
        └── dummy_facts.pl # Static facts for independent Prolog testing


4. Environment Configuration

Define the system paths and database connections in /mern-app/server/.env. Use forward slashes for Windows paths in Node to prevent escape character issues.

PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/timetable_db?retryWrites=true&w=majority
# Absolute path to the Prolog engine directory using forward slashes
PROLOG_ENGINE_PATH=C:/path/to/timetable-system/prolog-engine


Node uses PROLOG_ENGINE_PATH to set the cwd (current working directory) of the spawned child process.

5. MERN Backend Setup

The Node backend must aggregate data, translate it, spawn the process, and handle the JSON buffer securely. The application utilizes ES Modules (ESM) to align with modern JavaScript standards.

1. Initialize and Install Dependencies:

cd mern-app/server
npm init -y
npm install express mongoose dotenv cors


2. Configure ESM:
You must manually add "type": "module" to your package.json in the /server directory to enable import/export syntax.

3. The Execution Service (/services/prologService.js):
This module isolates the child process logic. It must handle timeouts, parse stdout, and guarantee the deletion of the temporary .pl file using a finally block to prevent disk bloat from concurrent requests. Since ESM does not expose __dirname globally, it must be reconstructed.

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Reconstruct __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function executePrologSolver(factsString) {
    const prologDir = process.env.PROLOG_ENGINE_PATH;
    const fileName = `facts_${crypto.randomUUID()}.pl`;
    const factsPath = path.join(__dirname, '../tmp', fileName);

    // Write the request-specific data to disk
    await fs.writeFile(factsPath, factsString);

    return new Promise((resolve, reject) => {
        // -q suppresses the SWI-Prolog banner to ensure pure JSON output
        const child = spawn('swipl', ['-q', '-f', factsPath, '-s', 'solver.pl', '-g', 'main,halt.'], {
            cwd: prologDir,
            shell: true // Required on some Windows setups to resolve PATH executables
        });

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data) => { stdoutData += data.toString(); });
        child.stderr.on('data', (data) => { stderrData += data.toString(); });

        // Hard timeout: 5 seconds. Enforces failure if Prolog search tree explodes.
        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('Prolog execution timed out. Search space too large.'));
        }, 5000);

        child.on('close', async (code) => {
            clearTimeout(timeout);
            
            // Cleanup must happen regardless of success/failure to prevent concurrent file locks
            await fs.unlink(factsPath).catch(console.error);

            if (code === 0) {
                try {
                    const result = JSON.parse(stdoutData.trim());
                    resolve(result);
                } catch (e) {
                    reject(new Error(`JSON Parse Error. Stdout: ${stdoutData}`));
                }
            } else if (code === 1) {
                reject(new Error('Constraints too tight. No solution exists.'));
            } else {
                reject(new Error(`Prolog process failed. Code: ${code}. Stderr: ${stderrData}`));
            }
        });
    });
}


6. MongoDB Schema Definitions

Relational integrity is crucial. Prolog constraints rely entirely on these data structures. All _id fields are auto-generated Mongoose ObjectIds.

Program: { name: String }

AcademicYear: { programId: ObjectId, yearNumber: Number }

Section: { yearId: ObjectId, name: String, strength: Number }

Teacher: { name: String, maxHoursPerWeek: Number, unavailableSlots: [{ day: String, slot: Number }] }

Room: { name: String, type: String (Enum: "classroom", "lab"), capacity: Number }

Course: { programId: ObjectId, yearNumber: Number, name: String, type: String (Enum: "theory", "lab"), hoursPerWeek: Number, consecutiveSlotsRequired: Number }

CourseAssignment: { courseId: ObjectId, sectionId: ObjectId, teacherIds: [ObjectId] }

Timetable: { sectionId: ObjectId, courseId: ObjectId, teacherId: ObjectId, roomId: ObjectId, day: String, slot: Number, isLocked: { type: Boolean, default: false } }

Why isLocked? Node queries existing Timetable records before generating. If isLocked: true, it passes this to Prolog as a locked_assignment to ensure manual administrative overrides are respected during regeneration.

7. Prolog Engine Setup & Algorithmic Requirements

The Prolog developer must build a strictly modularized CLP(FD) engine. Monolithic scripts will fail in production testing.

Required Libraries

library(clpfd): Establishes domains and prunes invalid search trees.

library(http/json): Serializes bindings to stdout for Node consumption.

library(time): Enables time-boxed execution wrappers.

Module Breakdown

solver.pl: Entry Point. Handles CLI arguments, initiates the call_with_time_limit/2 wrapper, and executes halt(Code).

domain.pl: Maps input facts to CLP(FD) variables.

Critical Optimization: Map Node's atoms (e.g., id_t1) to internal integers (e.g., 1) during domain creation. CLP(FD) processes integers exponentially faster.

constraints.pl: Enforces mathematical boundaries BEFORE labeling begins.

heuristics.pl: Defines the objective function Score.

output.pl: Formats final bindings into a dictionary and writes to stdout.

8. Node → Prolog Integration (Fact Generation)

Node must convert MongoDB ObjectIds to valid Prolog atoms (prefixing with id_).

Fact Generation Example:
The execution service should produce a block exactly like this. This structure is what the Prolog developer will use for dummy_facts.pl.

% Base Entities
teacher(id_t1, 16).
teacher(id_t2, 12).
room(id_r1, classroom, 60).
room(id_r2, lab, 30).
section(id_sec1, 60).
course(id_c1, theory, 4, 1).
course(id_c2, lab, 2, 2).

% Relational Mappings
section_course(id_sec1, id_c1).
section_course(id_sec1, id_c2).
allowed_teachers(id_c1, id_sec1, [id_t1, id_t2]).
allowed_teachers(id_c2, id_sec1, [id_t2]).

% Boundary Constraints
unavailable(id_t1, mon, 1).

% Locked Assignments (Manual Overrides from previous generates)
locked_assignment(id_sec1, id_c1, mon, 1).

% The Grid
day(mon). day(tue). day(wed). day(thu). day(fri).
slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).


9. Solver Execution Flow

The Prolog algorithm must execute in this exact sequence:

Fact Ingestion: Load the generated .pl file.

Integer Mapping: Convert input atoms (id_t1) to integers (1).

Domain Definition: Declare assignment variables (Day 1..5, Slot 1..8).

Constraint Application: Apply hard constraints (#=, #\=, #>=). Locked assignments must pre-bind variable domains here.

Heuristics Setup: Define the objective variable Score.

Labeling (Search Strategy): Execute labeling([ffc, bisect, max(Score)], Vars).

Output: Map integers back to atoms. Serialize to JSON. Write to stdout. Terminate with halt(0).

10. Core Business Constraints (Prolog Engine)

To prevent generating mathematically valid but human-impossible schedules, the CLP(FD) engine must enforce these strict boundaries in constraints.pl.

Locked Assignments: The solver must respect any locked_assignment/4 facts by pre-binding the Day and Slot variables for that specific section and course before search labeling begins.

Teacher Daily Limit: A teacher can be assigned a maximum of 6 slots per day to prevent burnout (teacher_daily_hours <= 6).

Section Consecutive Fatigue: A section cannot have more than 4 consecutive classes without a break (lunch or free period).

Teacher Consecutive Fatigue: A teacher cannot teach for more than 4 consecutive slots without a break.

Strict Exclusivity: A teacher cannot be in two rooms at once. A room cannot hold two sections unless they are participating in the exact same grouped lecture.

Lunch Isolation: To guarantee a lunch break, the solver must enforce that the boolean occupation of Slot 4 and Slot 5 yields Slot4 + Slot5 #=< 1.

11. Pre-Generation Validation Rules (Node.js)

Passing mathematically impossible constraints to an NP-hard solver guarantees a timeout. Before Node spawns the Prolog process, it must perform these O(N) sanity checks. If any fail, reject the API request immediately.

Section Readiness: Every active section must be assigned at least one course.

Course Readiness: Every course assigned to a section must have at least one teacher in its teacherIds array.

Grid Capacity Validation: For any given section, the sum of hoursPerWeek across all assigned courses must be ≤ 35 (5 days * 7 available slots, accounting for 1 lunch slot).

Teacher Capacity Validation: The sum of hoursPerWeek for all courses assigned to a specific teacher must be ≤ teacher.maxHoursPerWeek.

Room Feasibility (Lab): If a lab course exists in the payload, there must be at least one room where type === 'lab'.

Room Feasibility (Capacity): For every section, there must be at least one room in the system where room.capacity >= section.strength.

Locked Slot Integrity: Locked assignments must not exceed the total hoursPerWeek for their respective course, nor conflict with a teacher's unavailableSlots.

12. Timetable Rendering Contract (React UI)

The frontend must deterministically map the JSON output array into a visual grid.

Grid Dimensions: 5 Columns (Mon-Fri) x 8 Rows (Slots 1-8).

Cell Content: If an assignment exists for a coordinate, render:

Course Name

Teacher Name

Room Name

Lunch Visualization: The Prolog engine guarantees exactly one empty slot in either Slot 4 or Slot 5 per day. The frontend logic must explicitly look for the unassigned slot in {4, 5} and render a styled "Lunch Break" block.

Free Periods: Any other unassigned slots (outside of the designated lunch) render as an empty "Free Period" cell.

13. Performance Expectations & Scale

The system and algorithms are designed to support the following scale within the 5-second hard timeout limit:

Programs: 1 (e.g., B.Tech CSE)

Years: 4 Active Academic Years

Sections: 3 Sections per Year (Total 12 Sections)

Grid: 5 Days x 8 Slots

Resources: Up to 30 Teachers, Up to 20 Rooms

If the scale drastically exceeds these parameters (e.g., 100 sections), the architecture must shift from a single synchronous API call to a queue-based asynchronous worker (e.g., Redis + BullMQ) with extended timeouts.

14. Running the Project (Windows)

Verify Atlas Access: Ensure your IP address is whitelisted in MongoDB Atlas.

Start Backend: Open a command prompt. cd mern-app\server then npm run dev.

Start Frontend: Open a second command prompt. cd mern-app\client then npm start.

Trigger: Navigate to the Admin Dashboard, populate the database, and click "Generate Timetable".

15. Debugging Guide

Exit Code 2 (Syntax Error): Node generated malformed facts. Check the temporary file for missing periods ..

JSON Parse Error: SWI-Prolog printed a warning message (e.g., "Singleton variables"). Ensure -q is passed to swipl in Node.

Exit Code 1 (Unsolvable): Constraints are mathematically impossible. Review the DB state.

Timeout (SIGKILL): The search space is too large. Review constraints.pl to ensure boundaries are tight and labeling/2 uses the ffc strategy.

16. Development Workflow

MERN Developer: Focus on CRUD APIs, the Pre-Generation Validation layer (Section 11), and the Fact Generation string formatting. Mock the Prolog JSON response to unblock frontend development.

Prolog Developer: Focus entirely on CLP(FD). Execute solver.pl against the static dummy_facts.pl via terminal.

17. Post-MVP UI Enhancements (Optional)

Once the core deterministic solver is functioning, these features can be built purely on the MERN layer without altering the Prolog contract:

Regenerate / Shuffle: Pass a random seed to the solver or alter heuristic weights slightly to yield a different valid layout.

Lock Slots UI: The Prolog engine contract already supports the locked_assignment constraint. The UI simply needs a drag-and-drop feature to pin a class; Node will pass these coordinates to Prolog on the next generation.

Entity-Specific Views: Build React routes to view the grid filtered by a specific Teacher or a specific Room.

Export: Implement jspdf or puppeteer to export the React grid to PDF.

18. Example End-to-End Run

Admin UI: User creates Teacher "Dr. Smith", Course "OS" (4 hrs), Section "CSE-A".

Admin UI: User maps OS to CSE-A, assigned to Dr. Smith. Clicks "Generate".

Node Service: Runs Section 11 validations. All pass.

Node Service: Queries MongoDB Atlas. Writes facts to a temporary facts_uuid.pl file.

Node Service: Spawns swipl.

Prolog Engine: Ingests facts. Converts to integers. Identifies 4 hours needed. Binds Dr. Smith to CSE-A for 4 distinct slots. Serializes bindings to JSON. Halts with code 0.

Node Service: Reads stdout. Parses JSON. Deletes .pl file. Maps IDs back to MongoDB ObjectIds. Saves to Atlas.

React UI: Fetches Timetable collection. Renders OS in Slot 1, and visually leaves the unassigned Slot 4/5 as a labeled "Lunch Break" block.