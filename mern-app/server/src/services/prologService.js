import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const unlinkPromise = promisify(fs.unlink);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the real Prolog solver using SWI-Prolog.
 *
 * Flow:
 * 1. Shuffle input facts (Phase 7) for light per-run randomisation.
 * 2. Write the generated facts to a temporary file.
 * 3. Execute swipl command using the solver.pl file in the prolog-engine directory.
 * 4. Parse structured stderr logs (Phase 8) for full trace visibility.
 * 5. Parse JSON output and map it to the expected "drafts" format.
 * 6. Clean up the temporary file.
 */
export async function executePrologSolver(factsString) {
    const serverSrc  = path.resolve(__dirname, '..');
    const serverRoot = path.resolve(serverSrc, '..');
    // prolog-engine is at the same level as mern-app
    const prologDir  = path.resolve(serverRoot, '..', '..', 'prolog-engine');
    const tmpDir     = path.resolve(serverRoot, 'tmp');

    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const factsFilePath = path.join(tmpDir, `facts_${Date.now()}.pl`);

    // Determine SWIPL path from environment or default to 'swipl'
    let swiplPath = process.env.PROLOG_ENGINE_PATH || 'swipl';

    // If it looks like a directory path, try to find the executable within it
    if (swiplPath.includes('\\') || swiplPath.includes('/')) {
        const potentialExe = path.join(swiplPath, 'swipl.exe');
        if (fs.existsSync(potentialExe)) {
            swiplPath = potentialExe;
        } else {
            const potentialExeUnix = path.join(swiplPath, 'swipl');
            if (fs.existsSync(potentialExeUnix)) {
                swiplPath = potentialExeUnix;
            }
        }
    }

    try {
        // ----------------------------------------------------------------
        // PHASE 7: Shuffle input facts for light randomisation.
        // Shuffles section_course and teacher fact blocks independently so
        // the labeling variable order changes each run → different valid
        // schedules are produced without breaking any constraint.
        // ----------------------------------------------------------------
        const shuffledFacts = shuffleFacts(factsString);

        console.log(`[PrologService] Writing facts to ${factsFilePath}`);
        await writeFilePromise(factsFilePath, shuffledFacts);

        // swipl -q -g "solve_from_file('ABS_PATH')" -t halt solver.pl
        const normalizedFactsPath = factsFilePath.replace(/\\/g, '/');
        const cmd = `"${swiplPath}" -q -g "solve_from_file('${normalizedFactsPath}')" -t halt solver.pl`;

        console.log(`[PrologService] Executing: ${cmd}`);
        console.log(`[PrologService] CWD: ${prologDir}`);

        const { stdout, stderr } = await execPromise(cmd, { cwd: prologDir });

        // ----------------------------------------------------------------
        // PHASE 8: Structured stderr parsing — full visibility into every
        // Prolog decision (placement counts, fallback tier, warnings).
        // ----------------------------------------------------------------
        if (stderr) {
            parsePrologStderr(stderr);
        }

        if (stderr && stderr.includes('FAILED_CONSTRAINT')) {
            throw new Error(
                'Constraint unsatisfiable. Prolog engine hit a deadlock or mathematical failure.'
            );
        }

        if (!stdout || stdout.trim() === '') {
            throw new Error('Prolog solver returned empty output.');
        }

        const result = JSON.parse(stdout.trim());

        if (result.status === 'failure') {
            throw new Error(result.reason || 'Prolog solver failed to find a valid solution.');
        }

        console.log(`[PrologService] Solver state: ${result.solverState}`);

        // Map Prolog output "solutions" → frontend expected "drafts"
        return {
            drafts: result.solutions || []
        };

    } catch (error) {
        console.error(`[PrologService] Error: ${error.message}`);
        throw error;
    } finally {
        // Cleanup the temporary facts file
        try {
            if (fs.existsSync(factsFilePath)) {
                await unlinkPromise(factsFilePath);
            }
        } catch (cleanupError) {
            console.error(`[PrologService] Cleanup Error: ${cleanupError.message}`);
        }
    }
}

// -----------------------------------------------------------------------
// PHASE 7 HELPER: shuffleFacts
//
// Splits facts by predicate prefix, shuffles each block with Fisher-Yates,
// then reassembles.  Only section_course/2 and teacher/2 facts are shuffled
// because their ordering directly drives the labeling variable creation
// order in domain.pl — all other facts (day/slot/room/section/course defs)
// remain in their original order.
// -----------------------------------------------------------------------
function shuffleFacts(factsString) {
    const lines = factsString.split('\n');

    const sectionCourseLines = [];
    const teacherLines       = [];
    const otherLines         = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('section_course(')) {
            sectionCourseLines.push(line);
        } else if (trimmed.startsWith('teacher(')) {
            teacherLines.push(line);
        } else {
            otherLines.push(line);
        }
    }

    fisherYatesShuffle(sectionCourseLines);
    fisherYatesShuffle(teacherLines);

    // Reassemble: structural defs first, shuffled course/teacher blocks last
    const reassembled = [
        ...otherLines,
        ...sectionCourseLines,
        ...teacherLines,
    ].join('\n');

    console.log(
        `[PrologService] Shuffled ${sectionCourseLines.length} section_course facts, ` +
        `${teacherLines.length} teacher facts.`
    );

    return reassembled;
}

/** Fisher-Yates in-place shuffle */
function fisherYatesShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// -----------------------------------------------------------------------
// PHASE 8 HELPER: parsePrologStderr
//
// Routes Prolog stderr lines to structured Node.js console channels:
//   [Prolog:DEBUG]    — placement counts + solver state (from format/3)
//   [Prolog:FALLBACK] — tier transition events (TIMEOUT, QUALITY, EMERGENCY)
//   [Prolog:ERROR]    — anything containing "error" or "warning"
//   [Prolog:WARN]     — everything else
// -----------------------------------------------------------------------
function parsePrologStderr(stderr) {
    const lines = stderr.split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;

        if (line.includes('[DEBUG]')) {
            console.log(`[Prolog:DEBUG] ${line.trim()}`);
        } else if (
            line.includes('TIMEOUT_RECOVERY') ||
            line.includes('QUALITY_FALLBACK') ||
            line.includes('EMERGENCY_RELAXED')
        ) {
            console.warn(`[Prolog:FALLBACK] ${line.trim()}`);
        } else if (
            line.toLowerCase().includes('error') ||
            line.toLowerCase().includes('warning')
        ) {
            console.error(`[Prolog:ERROR] ${line.trim()}`);
        } else {
            console.warn(`[Prolog:WARN] ${line.trim()}`);
        }
    }
}
