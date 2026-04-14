import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';

let isGenerating = false;

export const generateDrafts = async (req, res) => {
    if (isGenerating) {
        return res.status(423).json({ error: 'Generation already in progress.' });
    }

    isGenerating = true;

    try {
        console.log('Starting draft generation with Unified Courses...');

        const teachers    = await models.Teacher.find();
        const rooms       = await models.Room.find();
        const sections    = await models.Section.find();
        const courses     = await models.Course.find();
        const assignments = await models.CourseAssignment.find();

        if (!teachers.length || !rooms.length || !sections.length || !courses.length) {
            return res.status(400).json({ error: 'Insufficient data for generation.' });
        }

        // 1. Transpile to Prolog
        let facts = '';
        teachers.forEach(t => facts += `teacher(id_${t._id}, ${t.maxHoursPerWeek}).\n`);
        rooms.forEach(r => facts += `room(id_${r._id}, ${r.type}, ${r.capacity}).\n`);
        sections.forEach(s => facts += `section(id_${s._id}, ${s.strength}).\n`);
        
        courses.forEach(c => {
            if (c.theoryHours > 0) 
                facts += `course(id_${c._id}_T, theory, ${c.theoryHours}, ${c.theoryConsecutive || 1}).\n`;
            if (c.labHours > 0) 
                facts += `course(id_${c._id}_L, lab, ${c.labHours}, ${c.labConsecutive || 2}).\n`;
        });

        assignments.forEach(a => {
            const c = courses.find(course => course._id.toString() === a.courseId.toString());
            if (!c) return;
            if (c.theoryHours > 0 && a.theoryTeacherIds?.length) {
                facts += `section_course(id_${a.sectionId}, id_${c._id}_T).\n`;
                facts += `allowed_teachers(id_${c._id}_T, id_${a.sectionId}, [${a.theoryTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
            }
            if (c.labHours > 0 && a.labTeacherIds?.length) {
                facts += `section_course(id_${a.sectionId}, id_${c._id}_L).\n`;
                facts += `allowed_teachers(id_${c._id}_L, id_${a.sectionId}, [${a.labTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
            }
        });

        teachers.forEach(t => t.unavailableSlots?.forEach(s => facts += `unavailable(id_${t._id}, ${s.day}, ${s.slot}).\n`));
        facts += 'day(mon). day(tue). day(wed). day(thu). day(fri).\nslot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n';

        // 2. Execute solver
        const engineResponse = await executePrologSolver(facts);

        if (!engineResponse || !engineResponse.drafts) {
            throw new Error('Solver failed to return status.');
        }

        // 3. Map back to Human-Readable and DB objects
        const cleanDrafts = engineResponse.drafts.map(draft => ({
            score: draft.score,
            timetable: draft.timetable.map(entry => {
                const isTheory = entry.courseId.endsWith('_T');
                const isLab = entry.courseId.endsWith('_L');
                const cid = entry.courseId.replace('id_', '').replace('_T', '').replace('_L', '');
                const sid = entry.sectionId.replace('id_', '');
                const tid = entry.teacherId.replace('id_', '');
                const rid = entry.roomId.replace('id_', '');

                const course = courses.find(c => c._id.toString() === cid);
                const teacher = teachers.find(t => t._id.toString() === tid);
                const section = sections.find(s => s._id.toString() === sid);
                const room = rooms.find(r => r._id.toString() === rid);

                return {
                    sectionId: sid,
                    sectionName: section?.name || sid,
                    courseId: cid,
                    courseName: course?.name || cid,
                    teacherId: tid,
                    teacherName: teacher?.name || tid,
                    roomId: rid,
                    roomName: room?.name || rid,
                    day: entry.day,
                    slot: entry.slot,
                    component: isLab ? 'lab' : 'theory'
                };
            })
        }));

        const draftDoc = await models.DraftTimetable.create({
            drafts: cleanDrafts,
            createdBy: req.user._id
        });

        res.json({ draftId: draftDoc._id });

    } catch (err) {
        console.error('Generator Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        isGenerating = false;
    }
};

export const getDraft = async (req, res) => {
    try {
        const draft = await models.DraftTimetable.findById(req.params.id);
        res.json(draft);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const publishDraft = async (req, res) => {
    try {
        const { draftId, optionIndex } = req.params;
        const draftDoc = await models.DraftTimetable.findById(draftId);
        if (!draftDoc) return res.status(404).json({ error: 'Draft not found' });
        
        const chosen = draftDoc.drafts[parseInt(optionIndex, 10)];
        await models.Timetable.deleteMany({});
        await models.Timetable.insertMany(chosen.timetable.map(t => ({
            sectionId: t.sectionId,
            courseId: t.courseId,
            teacherId: t.teacherId,
            roomId: t.roomId,
            day: t.day,
            slot: t.slot,
            component: t.component
        })));

        await models.DraftTimetable.findByIdAndDelete(draftId);
        res.json({ message: 'Published successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
