University Timetable Generator: MERN & Prolog Integration Contract

This document is the absolute single source of truth for the University Timetable system. It defines exactly how the MERN stack (MongoDB, Express, React, Node) communicates with the Prolog scheduling engine.

Whether you are building the Node API or writing the Prolog constraints, this document dictates what your code must accept, process, and return. Read it carefully.

1. System Architecture & The "Why"

Timetabling is an "NP-Hard" combinatorial problem. As resources (teachers, rooms, sections) scale, the number of possible timetable combinations grows exponentially into the billions.

Node.js is highly efficient at handling asynchronous I/O, database transactions, and HTTP requests, but it lacks the mathematical computation capabilities required for complex combinatorial optimization. Prolog is a declarative logic programming language explicitly designed to resolve these types of constraint satisfaction problems.

Therefore, the system architecture is strictly bifurcated:

Orchestrator (MERN): Handles state, persistence, data aggregation, and triggers the solver.

Stateless Worker (Prolog): Ingests a snapshot of the database state, executes the mathematical solver, returns a JSON string of the optimal schedule, and terminates.

2. Strict Technology Stack

To ensure environment consistency and prevent integration failures, both developers must strictly adhere to the following stack.

2.1 The MERN Orchestrator

Runtime: Node.js (v18+ LTS).

Framework: Express.js.

Database: MongoDB, managed via Mongoose ODM.

Process Management: Node native child_process module (spawn or execFile). No third-party bridging libraries (e.g., node-swi-prolog) will be used due to their instability in production environments.

File System: Node native fs/promises for temporary .pl file generation.

2.2 The Prolog Engine

Engine: SWI-Prolog (v8.0.0 or higher).

Core Paradigm: Constraint Logic Programming over Finite Domains (CLP(FD)).

Required Standard Libraries:

library(clpfd): Absolutely mandatory for establishing mathematical domains and pruning the search tree.

library(http/json): Mandatory for serializing Prolog structures into a standard JSON string for Node.js to consume.

library(time): Mandatory for implementing the hard time-boxed execution wrappers.

3. User Roles

The system recognizes two primary levels of access.

Administrator (Admin): * Has full read/write access to the database.

Can add, edit, or delete Teachers, Rooms, Courses, and Sections.

Is the only role authorized to click the "Generate Timetable" button, which triggers the Prolog engine.

Viewer (Student / Faculty): * Has read-only access.

Can log in to see the generated schedule for their specific section or personal teaching schedule.

Cannot trigger timetable generation.

4. End-to-End System Flow

This is the exact lifecycle of how data moves from a human's brain, through the system, and back to a user's screen.

Phase 1: Data Entry (Admin UI & Validation)
The Admin logs into the React dashboard. Because timetabling relies on strict relational data, data entry must happen in a specific, validated sequence to prevent orphaned records.

Base Entities: Admin defines Programs, AcademicYears, Rooms (with capacity constraints), and Teachers (with specific unavailability slots and max hours). Batch CSV upload should be supported for bulk entry.

Grouping: Admin defines Sections and links them to the respective AcademicYears.

Curriculum: Admin defines Courses (theory vs. lab, required hours, consecutive block requirements).

Mapping (The Assignment): Admin creates CourseAssignments linking a Course to a Section, and provides an array of valid TeacherIds.
UI Validation Rule: The UI must prevent the admin from assigning a course to a teacher if the course's required hours exceed the teacher's remaining maxHoursPerWeek. Entities must be softly deleted (isActive: false) rather than hard deleted to preserve historical timetable data integrity.

Phase 2: The Trigger
The Admin navigates to the "Generate" page and clicks "Generate Master Timetable". React sends a POST request to the Node.js API.

Phase 3: Aggregation (Node.js)
Node.js queries MongoDB. It pulls every active Teacher, Room, Section, Course, and Assignment into memory. It translates the MongoDB ObjectIds into Prolog atoms (e.g., ObjectId("123") becomes id_123).

Phase 4: Fact Writing (Node.js)
Node.js writes all this translated data into a temporary text file named with a UUID, for example, facts_a1b2.pl.

Phase 5: Execution (Node.js -> Prolog)
Node.js executes a terminal command to start SWI-Prolog, feeding it the facts_a1b2.pl file and the solver.pl engine.

Phase 6: Solving (Prolog)
Prolog takes over. It applies the hard constraints. It uses heuristics to find a schedule that doesn't just work, but is actually good (no teacher gaps, spread out subjects). Prolog utilizes a strict CLPFD search strategy to find the best schedule, prints it to the terminal (stdout) as a JSON string, and shuts down.

Phase 7: Persistence (Node.js)
Node.js captures the JSON output from the terminal. It deletes the temporary facts_a1b2.pl file. It strips the id_ prefixes to get the original MongoDB ObjectIds back. It deletes any old timetables for this academic period and saves the new assignments into the MongoDB Timetable collection. Node sends a "Success" response back to React.

Phase 8: Consumption (React UI)
The Admin, Students, and Teachers can now view the timetable. React fetches the Timetable collection from Node, formats it into a 5-day, 8-slot grid, and leaves empty slots at 12:00 PM or 1:00 PM labeled as "Lunch".

5. Database Schema (MongoDB / Mongoose)

To ensure the MERN developer and Prolog developer are speaking the same language, the data structure must be strictly defined. Node will build the Prolog facts directly from these schemas.

All _id fields are auto-generated MongoDB ObjectIds.

5.1 Program

name: String (e.g., "B.Tech CSE")

5.2 AcademicYear

programId: ObjectId (Ref: Program)

yearNumber: Number (e.g., 1, 2, 3, 4)

5.3 Section

yearId: ObjectId (Ref: AcademicYear)

name: String (e.g., "Section A")

strength: Number (e.g., 60). Used by Prolog to ensure the assigned room is large enough.

5.4 Room

name: String (e.g., "Room 101", "Computer Lab 3")

type: String Enum ("classroom", "lab"). Labs must go to lab rooms.

capacity: Number (e.g., 65).

5.5 Teacher

name: String

maxHoursPerWeek: Number (e.g., 16). Critical for limiting solver assignments.

unavailableSlots: Array of Objects [{ day: String, slot: Number }].

5.6 Course

programId: ObjectId (Ref: Program)

yearNumber: Number

name: String (e.g., "Data Structures")

type: String Enum ("theory", "lab").

hoursPerWeek: Number (e.g., 4)

consecutiveSlotsRequired: Number (e.g., 1 for theory, 2 for lab). Explicit definition over implicit type inference.

5.7 CourseAssignment (The Mapping)

courseId: ObjectId (Ref: Course)

sectionId: ObjectId (Ref: Section)

teacherIds: Array of ObjectIds (Ref: Teacher).

5.8 Timetable (The Final Output)

sectionId: ObjectId (Ref: Section)

courseId: ObjectId (Ref: Course)

teacherId: ObjectId (Ref: Teacher)

roomId: ObjectId (Ref: Room)

day: String Enum ("mon", "tue", "wed", "thu", "fri")

slot: Number (1 through 8)

6. Folder Structure and Isolation

Do not put Node.js files and Prolog files in the same folder. They are separate services.

/mern-app
  /client          (React UI)
  /server
    /src
      /models      (Mongoose Schemas defining how data looks in the DB)
      /controllers (Logic to fetch DB data and write the Prolog files)
      /services    (Logic to execute SWI-Prolog via the terminal)
    .env           (Environment file holding PROLOG_ENGINE_PATH)

/prolog-engine
  solver.pl        (The main Prolog script that Node will execute)
  domain.pl        (Handles parsing facts into variable domains)
  constraints.pl   (The hard rules via clpfd)
  heuristics.pl    (The soft rules scoring via clpfd)
  output.pl        (JSON serialization logic)
  /tests
    dummy_facts.pl (A fake data file so the Prolog dev can test without Node)


Node will find the Prolog folder by looking at an environment variable named PROLOG_ENGINE_PATH.

7. Deep-Dive: Prolog Developer Engineering Requirements

This section strictly outlines the architectural and algorithmic requirements for the Prolog developer. Building a timetable engine using standard Prolog "generate and test" paradigms will fail in production due to combinatorial explosion.

7.1 Mathematical Foundation (CLP(FD))

The solver must not rely on pure backtracking. Pure Prolog assigns a value, checks if it violates a rule, and then backtracks. In a 30-teacher grid, this will take years to resolve.

The engineer must use library(clpfd).

Domain Declaration: Before any search begins, all assignments must be modeled as finite domain variables. Example: Every class assignment requires a Day variable in 1..5 and a Slot variable in 1..8.

Constraint Propagation: Hard constraints (e.g., RoomCapacity #>= SectionStrength, or TeacherX_Slot1 #\= TeacherY_Slot1) must be applied before labeling. This allows CLP(FD) to mathematical prune invalid branches from the search tree instantly.

7.2 Variable Structure & Modeling

The engineer should model the problem by creating a flat list of assignment tuples/records, where the attributes are domain variables.
Assignment = assign(SectionId, CourseId, TeacherVar, RoomVar, DayVar, SlotVar)

TeacherVar: Domain is the integer mapped IDs of the allowed_teachers.

RoomVar: Domain is the integer mapped IDs of all valid rooms (filtered by lab/theory and capacity before domain creation).

DayVar: Domain is 1..5.

SlotVar: Domain is 1..8.

Note: Prolog integers process exponentially faster than atoms in CLP(FD). The engineer should temporarily map Node's string atoms (id_t1) to internal integers (1) during the domain phase, solve the problem with integers, and map them back to atoms just before JSON serialization.

7.3 Optimization Algorithm (Branch and Bound)

Because we evaluate Soft Constraints (heuristics), the solver is not just looking for any valid schedule; it is looking for the best schedule within a time limit.

The engineer must implement a Branch and Bound optimization strategy combined with a time-box.

The Algo: As the solver finds a valid schedule, it calculates its Score. It then explicitly asserts a constraint that the next schedule it finds must have a Score #> CurrentScore.

Time-Boxing: Wrap the labeling process in call_with_time_limit(4.5, ... ). When the timeout triggers, the solver must catch the time_limit_exceeded exception and output the highest-scoring timetable it has cached in memory, rather than failing entirely.

7.4 Search Strategy (Labeling Heuristics)

The solver must not rely on the default left-to-right labeling execution. The engineer must explicitly define the search strategy to traverse the tree efficiently.

The labeling/2 predicate must utilize the following strategy:
labeling([ffc, bisect, max(Score)], Vars)

ffc (First-Fail Principle with Constraints): The algorithm must select the variable with the smallest domain and the most constraints attached to it to instantiate first. This forces the solver to tackle the most difficult placements (e.g., 4-hour labs in constrained rooms) immediately, causing early failures and massive pruning.

bisect: Instead of trying values sequentially (Day = 1, then Day = 2), the solver should split the domain in half (Day #=< 3 or Day #> 3). This isolates the search space much faster.

max(Score): Explicitly tells the CLP(FD) engine that the objective function is to maximize the heuristic score variable.

7.5 Serialization

Node.js relies on strict JSON. The Prolog engine must avoid any string manipulation and use library(http/json) to output the final data structure.

8. The Grid & The "Implicit Lunch" Strategy

The Week: 5 Days (Monday through Friday).

The Day: 8 Slots (Slot 1 starts at 9:00 AM, Slot 8 ends at 5:00 PM).

Lunch Logic: We do not schedule "Lunch" as a literal class. That creates unnecessary complexity. Instead, we use "omission".

The Rule: For every single section, on every single day, ≤ 7 slots can be occupied by courses. The solver must guarantee that exactly one slot in the domain {4, 5} remains unassigned.

CLP(FD) Implementation: If a section's schedule is represented as a boolean array for the day where 1 is occupied and 0 is free, the constraint must enforce Slot4 + Slot5 #=< 1.

9. Input Data Format (Node to Prolog)

Node will dynamically write this based on database records. Overloading relations is strictly forbidden.

% --- ENTITIES ---
% teacher(TeacherId, MaxHoursPerWeek).
teacher(id_t1, 16).
teacher(id_t2, 12).

% room(RoomId, RoomType, Capacity).
room(id_r1, classroom, 60).
room(id_r2, classroom, 150). % Large hall for parallel lectures
room(id_r3, lab, 30).

% section(SectionId, NumberOfStudents).
section(id_sec1, 60).
section(id_sec2, 60).

% --- COURSES ---
% course(CourseId, Type, TotalHoursPerWeek, ConsecutiveSlots).
course(id_c1, theory, 4, 1).
course(id_c2, lab, 2, 2). % Explicit contiguous slot definition

% --- MAPPINGS ---
% section_course(SectionId, CourseId).
% Explicit mapping of curriculum to a specific student group.
section_course(id_sec1, id_c1).
section_course(id_sec1, id_c2).
section_course(id_sec2, id_c1).

% allowed_teachers(CourseId, SectionId, [ListOfValidTeacherIds]).
% Rule: Prolog must pick exactly ONE teacher from this list to teach all hours.
allowed_teachers(id_c1, id_sec1, [id_t1, id_t2]).
allowed_teachers(id_c1, id_sec2, [id_t1]).

% --- UNAVAILABILITY ---
% unavailable(TeacherId, Day, Slot).
unavailable(id_t1, mon, 1).

% --- THE GRID (Static definitions) ---
day(mon). day(tue). day(wed). day(thu). day(fri).
slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).


10. Business Rules (Constraints)

10.1 Hard Constraints (Non-Negotiable)

Conditional Exclusivity (Teacher): A teacher cannot teach two different courses at the same time. A teacher may be assigned to multiple sections in the same (Day, Slot) coordinate ONLY IF it is a grouped parallel lecture (exact same CourseId AND exact same RoomId). A human cannot physically be in two different rooms at once.

Conditional Exclusivity (Room & Section): A section cannot take two classes at the same time. A room cannot hold two sections at the same time UNLESS they are participating in a grouped parallel lecture (satisfying Rule 1).

Teacher Room Exclusivity: A teacher cannot be assigned to two different rooms in the exact same (Day, Slot) coordinate under any circumstances.

Strict Capacity: The Capacity of the assigned room must be ≥ the sum of the strength of all sections assigned to that room during that specific (Day, Slot).

Room Suitability: Lab courses must be placed in lab rooms. Theory courses must be placed in classroom rooms.

Teacher Maximum Workload: The sum of all hours assigned to a teacher across all sections and courses must be ≤ maxHoursPerWeek defined in the teacher/2 fact.

Teacher Consecutive Fatigue: A single teacher cannot be assigned to teach for more than 4 consecutive slots without a break.

Strict Lab Fatigue: A teacher cannot teach back-to-back lab blocks (i.e., more than 2 consecutive lab slots). A free slot or theory class must separate lab assignments.

Single Teacher Focus: If a course is 4 hours long, all 4 hours for that specific section must be taught by the same teacher chosen from the allowed_teachers list. Do not split hours among multiple teachers.

Availability: Honor the unavailable facts.

Exact Duration: If a course dictates 4 hours, exactly the required number of slots must be assigned to fulfill the total hours over the week.

Lab Contiguity & Lunch Isolation: If a course requires consecutive slots (e.g., ConsecutiveSlots = 2), they must occupy contiguous block variables S and S+1.
Rule: If a lab occupies S and S+1, then S != 4. A consecutive block cannot consume both Slot 4 and Slot 5, as one must remain empty for lunch.

Lunch Break Enforcement & Section Slot Cap: Each section must have ≤ 7 slots occupied by courses per day. The boolean occupation (1=class, 0=empty) of Slot 4 and Slot 5 must yield Slot4 + Slot5 #=< 1.

10.2 Soft Constraints (Heuristics for a Better Schedule)

(+ Points) Lecture Grouping (Parallel Teaching): Strongly prefer scheduling the exact same course taught by the same teacher to multiple sections in the same (Day, Slot, Room).

(+ Points) Spreading Heavy Courses: Avoid assigning all hours of a subject to the same day.

(+ Points) Room Stability (Section): A specific section should minimize room changes throughout a single day.

(- Points) Teacher Transit (Room Switching): Strongly penalize back-to-back classes taught by the same teacher in different rooms.

(- Points) Teacher Gaps: Avoid scheduling a teacher for Slot 1 and Slot 6 while leaving them idle for 4 hours in between.

(- Points) Fatigue: Avoid filling Slot 7 and Slot 8 heavily.

11. The Execution API (Node to Prolog)

We use a Command Line Interface (CLI) execution for integration.

The Execution Command

Node will run the following command in the terminal.

-q means "quiet". It tells Prolog not to print welcome messages or copyright text, so the output is pure JSON.

-f points to the specific facts file.

-s points to the solver engine.

-g "main,halt." tells Prolog to run the main function and then strictly shut down.

swipl -q -f tmp/facts_a1b2c3d4.pl -s solver.pl -g "main,halt."


Required Exit Codes

Prolog must communicate its status back to Node via halt(Code).

Exit Code 0: Success. Prolog found a schedule and printed it to stdout.

Exit Code 1: Unsolvable. Prolog proved mathematically that no schedule exists given the constraints.

Exit Code 2: Syntax Error. Something is wrong with the code or the input file.

Required Output (stdout)

If Exit Code 0 occurs, Prolog must print a valid JSON string.

{
  "status": "success",
  "score": 85,
  "timetable": [
    {
      "sectionId": "id_sec1",
      "courseId": "id_c1",
      "teacherId": "id_t1",
      "roomId": "id_r1",
      "day": "mon",
      "slot": 1
    }
  ]
}


12. Handling Failures and Timeouts in Node

The Unsolvable Request (Exit Code 1): If Node detects exit code 1, it must safely delete the temporary .pl file and send a 400 Bad Request to the React Frontend saying: "The constraints are too tight. We cannot generate this timetable."

The Runaway Process (Timeout): If the Prolog script freezes or fails to stop itself within 5.0 seconds, Node will forcefully terminate the process using child.kill('SIGKILL'), delete the temporary file, and return a 500 Internal Server Error to the frontend.