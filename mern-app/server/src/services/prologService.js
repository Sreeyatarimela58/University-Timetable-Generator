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
 * 1. Write the generated facts to a temporary file.
 * 2. Execute swipl command using the solver.pl file in the prolog-engine directory.
 * 3. Parse the JSON output and map it to the expected "drafts" format.
 * 4. Clean up the temporary file.
 */
export async function executePrologSolver(factsString) {
    const serverSrc = path.resolve(__dirname, '..');
    const serverRoot = path.resolve(serverSrc, '..');
    // prolog-engine is at the same level as mern-app
    const prologDir = path.resolve(serverRoot, '..', '..', 'prolog-engine');
    const tmpDir = path.resolve(serverRoot, 'tmp');

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
        console.log(`[PrologService] Writing facts to ${factsFilePath}`);
        await writeFilePromise(factsFilePath, factsString);

        // Command: swipl -q -g "solve_from_file('ABS_PATH_TO_FACTS')" -t halt solver.pl
        // Using absolute path for facts file and replacing backslashes with forward slashes for Prolog
        const normalizedFactsPath = factsFilePath.replace(/\\/g, '/');
        const cmd = `"${swiplPath}" -q -g "solve_from_file('${normalizedFactsPath}')" -t halt solver.pl`;
        
        console.log(`[PrologService] Executing: ${cmd}`);
        console.log(`[PrologService] CWD: ${prologDir}`);

        const { stdout, stderr } = await execPromise(cmd, { cwd: prologDir });

        if (stderr && stderr.includes('FAILED_CONSTRAINT')) {
            throw new Error("Constraint unsatisfiable. Prolog engine hit a deadlock or mathematical failure.");
        }

        if (stderr) {
            console.warn(`[PrologService] Warnings/Errors from Prolog:\n${stderr}`);
        }

        if (!stdout || stdout.trim() === '') {
            throw new Error("Prolog solver returned empty output.");
        }

        const result = JSON.parse(stdout.trim());
        
        if (result.status === "failure") {
            throw new Error(result.reason || "Prolog solver failed to find a valid solution.");
        }

        // Map Prolog output "solutions" to frontend expected "drafts"
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
