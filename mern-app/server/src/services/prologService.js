import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Reconstruct __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function executePrologSolver(factsString) {
    console.log("!!! PROLOG MOCK INVOKED: Bypassing child_process swipl !!!");
    
    return new Promise((resolve) => {
        // Extract available IDs from the facts string so Mongoose doesn't crash on insert
        const idMatches = [...factsString.matchAll(/id_([a-f\d]{24})/g)].map(m => m[1]);
        const uniqueIds = [...new Set(idMatches)];
        
        // Build a dummy timetable object if we have IDs available, else mock fake lengths
        const mockSection = uniqueIds[0];
        const mockCourse = uniqueIds[1] || mockSection;
        const mockTeacher = uniqueIds[2] || mockSection;
        const mockRoom = uniqueIds[3] || mockSection;

        setTimeout(() => {
            const result = {
                status: "success",
                score: 100,
                timetable: [
                    { sectionId: 'id_' + mockSection, courseId: 'id_' + mockCourse, teacherId: 'id_' + mockTeacher, roomId: 'id_' + mockRoom, day: "mon", slot: 1 },
                    { sectionId: 'id_' + mockSection, courseId: 'id_' + mockCourse, teacherId: 'id_' + mockTeacher, roomId: 'id_' + mockRoom, day: "mon", slot: 2 },
                    { sectionId: 'id_' + mockSection, courseId: 'id_' + mockCourse, teacherId: 'id_' + mockTeacher, roomId: 'id_' + mockRoom, day: "mon", slot: 3 },
                    // SLOTS 4 and 5 INTENTIONALLY LEFT BLANK TO DEMONSTRATE LUNCH FEATURE
                    { sectionId: 'id_' + mockSection, courseId: 'id_' + mockCourse, teacherId: 'id_' + mockTeacher, roomId: 'id_' + mockRoom, day: "mon", slot: 6 },
                    { sectionId: 'id_' + mockSection, courseId: 'id_' + mockCourse, teacherId: 'id_' + mockTeacher, roomId: 'id_' + mockRoom, day: "mon", slot: 7 }
                ]
            };
            resolve(result);
        }, 2000);
    });
}
