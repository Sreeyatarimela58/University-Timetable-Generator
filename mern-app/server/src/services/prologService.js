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
    if(!prologDir) throw new Error("PROLOG_ENGINE_PATH is undefined");

    const fileName = `facts_${crypto.randomUUID()}.pl`;
    // We must ensure 'tmp' folder exists! (It was created in setup, or we create it here)
    const tmpDir = path.join(__dirname, '../../tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    
    const factsPath = path.join(tmpDir, fileName);

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
                    // Try to extract only JSON in case there is some stray output
                    const strData = stdoutData.trim();
                    const maybeJsonStart = strData.indexOf('{');
                    const maybeJsonEnd = strData.lastIndexOf('}');
                    
                    if(maybeJsonStart !== -1 && maybeJsonEnd !== -1) {
                         const jsonStr = strData.substring(maybeJsonStart, maybeJsonEnd + 1);
                         const result = JSON.parse(jsonStr);
                         resolve(result);
                    } else {
                         const result = JSON.parse(strData);
                         resolve(result);
                    }
                    
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
