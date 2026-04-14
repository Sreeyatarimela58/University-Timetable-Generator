import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';

// In-memory generation lock to prevent concurrent runs
let isGenerating = false;

/**
 * POST /api/generate-drafts
 * Gathers DB state → builds Prolog facts → calls solver → persists 3 drafts → returns draftId
 */
export const generateDrafts = async (req, res) => {
    if (isGenerating) {
        return res.status(423).json({ error: 'Generation already in progress. Please wait.' });
    }

    isGenerating = true;

    try {
        console.log('Starting draft generation process...');

        // 1. Fetch entire database state
        const teachers    = await models.Teacher.find();
        const rooms       = await models.Room.find();
        const sections    = await models.Section.find();
        const courses     = await models.Course.find();
        const assignments = await models.CourseAssignment.find();

        // Validate minimum data
        if (!teachers.length || !rooms.length || !sections.length || !courses.length) {
            return res.status(400).json({
                error: 'Insufficient data. Need at least 1 Teacher, 1 Room, 1 Section, and 1 Course.'
            });
        }

        // 2. Transpile to Prolog facts (exact contract format)
        let facts = '';

        facts += '% Base Entities\n';
        teachers.forEach(t => facts += `teacher(id_${t._id}, ${t.maxHoursPerWeek}).\n`);
        rooms.forEach(r => facts += `room(id_${r._id}, ${r.type}, ${r.capacity}).\n`);
        sections.forEach(s => facts += `section(id_${s._id}, ${s.strength}).\n`);
        courses.forEach(c => facts += `course(id_${c._id}, ${c.type}, ${c.hoursPerWeek}, ${c.consecutiveSlotsRequired}).\n`);

        facts += '\n% Relational Mappings\n';
        assignments.forEach(a => {
            facts += `section_course(id_${a.sectionId}, id_${a.courseId}).\n`;
            const teacherList = a.teacherIds.map(tid => `id_${tid}`).join(', ');
            facts += `allowed_teachers(id_${a.courseId}, id_${a.sectionId}, [${teacherList}]).\n`;
        });

        facts += '\n% Boundary Constraints\n';
        teachers.forEach(t => {
            if (t.unavailableSlots) {
                t.unavailableSlots.forEach(slotObj => {
                    facts += `unavailable(id_${t._id}, ${slotObj.day}, ${slotObj.slot}).\n`;
                });
            }
        });

        facts += '\n% The Grid\n';
        facts += 'day(mon). day(tue). day(wed). day(thu). day(fri).\n';
        facts += 'slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n';

        // 3. Execute solver (mock or real)
        console.log('Executing prolog constraints solver...');
        const engineResponse = await executePrologSolver(facts);

        if (!engineResponse || !engineResponse.drafts || !engineResponse.drafts.length) {
            return res.status(500).json({ error: 'Solver returned no valid drafts.' });
        }

        // 4. Strip id_ prefixes for clean Mongo storage
        const cleanDrafts = engineResponse.drafts.map(draft => ({
            score: draft.score,
            timetable: draft.timetable.map(entry => ({
                sectionId: entry.sectionId.replace('id_', ''),
                courseId:   entry.courseId.replace('id_', ''),
                teacherId:  entry.teacherId.replace('id_', ''),
                roomId:     entry.roomId.replace('id_', ''),
                day:        entry.day,
                slot:       entry.slot
            }))
        }));

        // 5. Persist to DraftTimetable collection
        const draftDoc = await models.DraftTimetable.create({
            drafts: cleanDrafts,
            createdBy: req.user._id
        });

        console.log(`Drafts persisted with ID: ${draftDoc._id}`);
        res.json({ draftId: draftDoc._id });

    } catch (err) {
        console.error('Generator Error =>', err);
        res.status(500).json({ error: err.message || 'Generation failed' });
    } finally {
        isGenerating = false;
    }
};

/**
 * GET /api/drafts/:id
 * Fetch a persisted draft set for preview
 */
export const getDraft = async (req, res) => {
    try {
        const draft = await models.DraftTimetable.findById(req.params.id);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found or expired.' });
        }
        res.json(draft);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve draft.' });
    }
};

/**
 * POST /api/publish/:draftId/:optionIndex
 * Admin selects one of the 3 drafts → wipe live Timetable → insert chosen draft
 */
export const publishDraft = async (req, res) => {
    try {
        const { draftId, optionIndex } = req.params;
        const idx = parseInt(optionIndex, 10);

        const draftDoc = await models.DraftTimetable.findById(draftId);
        if (!draftDoc) {
            return res.status(404).json({ error: 'Draft not found or expired.' });
        }

        if (isNaN(idx) || idx < 0 || idx >= draftDoc.drafts.length) {
            return res.status(400).json({ error: 'Invalid option index.' });
        }

        const chosenDraft = draftDoc.drafts[idx];

        // Wipe existing live timetable
        await models.Timetable.deleteMany({});

        // Insert the chosen draft entries into the live collection
        const entries = chosenDraft.timetable.map(t => ({
            sectionId: t.sectionId,
            courseId:   t.courseId,
            teacherId:  t.teacherId,
            roomId:     t.roomId,
            day:        t.day,
            slot:       t.slot,
            isLocked:   false
        }));

        await models.Timetable.insertMany(entries);

        // Clean up the draft document after publishing
        await models.DraftTimetable.findByIdAndDelete(draftId);

        res.json({ message: `Draft option ${idx + 1} (Score: ${chosenDraft.score}) published successfully.` });

    } catch (err) {
        console.error('Publish Error =>', err);
        res.status(500).json({ error: 'Failed to publish draft.' });
    }
};
