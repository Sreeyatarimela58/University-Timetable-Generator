import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
// Slots 4 & 5 are implicit lunch — never scheduled
const VALID_SLOTS = [1, 2, 3, 6, 7, 8];

/**
 * Builds a mock timetable for one draft variant.
 * Each variant shuffles day/slot ordering differently to produce a distinct schedule.
 */
function buildMockDraft(ids, variantSeed) {
    const { sections, courses, teachers, rooms } = ids;
    const entries = [];

    sections.forEach((sectionId, si) => {
        courses.forEach((courseId, ci) => {
            const teacherId = teachers[(si + ci + variantSeed) % teachers.length];
            const roomId    = rooms[(si + ci + variantSeed) % rooms.length];
            // Spread across days deterministically but differently per variant
            const day  = DAYS[(si + ci + variantSeed) % DAYS.length];
            const slot = VALID_SLOTS[(si + ci + variantSeed) % VALID_SLOTS.length];
            entries.push({ sectionId, courseId, teacherId, roomId, day, slot });
        });
    });

    return entries;
}

/**
 * MOCK PROLOG SOLVER
 * 
 * In production this is replaced by child_process.spawn('swipl', ...).
 * The real Prolog engine must return:
 * {
 *   drafts: [
 *     { score: 91, timetable: [...] },
 *     { score: 87, timetable: [...] },
 *     { score: 83, timetable: [...] }
 *   ]
 * }
 * 
 * Node just returns it — NO shuffling, NO mutation.
 */
export async function executePrologSolver(factsString) {
    console.log('!!! PROLOG MOCK INVOKED: Returning 3 scored draft variants !!!');

    // Extract all unique Mongo IDs embedded in the facts string
    const idMatches = [...factsString.matchAll(/id_([a-f\d]{24})/g)].map(m => m[1]);
    const uniqueIds = [...new Set(idMatches)];

    // We need at minimum 1 ID to produce any meaningful mock
    if (uniqueIds.length === 0) {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('No entity IDs found in facts. Add Teachers, Rooms, Sections and Courses first.')), 500)
        );
    }

    // Parse distinct entity types from the facts string
    const sectionIds = [...new Set([...factsString.matchAll(/^section\(id_([a-f\d]{24})/gm)].map(m => m[1]))];
    const courseIds  = [...new Set([...factsString.matchAll(/^course\(id_([a-f\d]{24})/gm)].map(m => m[1]))];
    const teacherIds = [...new Set([...factsString.matchAll(/^teacher\(id_([a-f\d]{24})/gm)].map(m => m[1]))];
    const roomIds    = [...new Set([...factsString.matchAll(/^room\(id_([a-f\d]{24})/gm)].map(m => m[1]))];

    // Graceful fallback — use any available IDs if specific ones are absent
    const s = sectionIds.length ? sectionIds : [uniqueIds[0]];
    const c = courseIds.length  ? courseIds  : [uniqueIds[0]];
    const t = teacherIds.length ? teacherIds : [uniqueIds[0]];
    const r = roomIds.length    ? roomIds    : [uniqueIds[0]];

    const ids = { sections: s, courses: c, teachers: t, rooms: r };

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                drafts: [
                    { score: 91, timetable: buildMockDraft(ids, 0) },
                    { score: 87, timetable: buildMockDraft(ids, 1) },
                    { score: 83, timetable: buildMockDraft(ids, 2) }
                ]
            });
        }, 2000); // simulate computation delay
    });
}
