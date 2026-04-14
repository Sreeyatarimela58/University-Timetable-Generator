// e:/timetablegen/mern-app/server/test_engine.js
require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

// Read the engine path from your newly fixed .env file
const swiplPath = process.env.PROLOG_ENGINE_PATH || "swipl";

// Point to the dummy facts file we generated, or a custom one from the terminal
const factsFilePath = process.argv[2] || 'tests/dummy_facts.pl'; 

// Run from the prolog-engine folder so it finds solver.pl
const prologDir = path.resolve(__dirname, '../../prolog-engine');

const cmd = `"${swiplPath}" -q -g "solve_from_file('${factsFilePath}')" -t halt solver.pl`;

console.log(`Running command: ${cmd}\n`);

exec(cmd, { cwd: prologDir }, (error, stdout, stderr) => {
    if (error) {
        console.error("❌ Execution Error:");
        console.error(error.message);
        return;
    }
    if (stderr) {
        console.error("⚠️ Prolog warnings/errors:");
        console.log(stderr);
    }
    
    console.log("✅ Output from Prolog JSON:");
    try {
        const result = JSON.parse(stdout.trim());
        console.log(JSON.stringify(result, null, 2));
        if (result.status === "failure") {
            console.log("\nTimetable generation failed (see constraint reason above).");
        } else {
            console.log("\nTimetable successfully generated!");
        }
    } catch (e) {
        console.error("Failed to parse JSON. Raw Output:");
        console.log(stdout);
    }
});
