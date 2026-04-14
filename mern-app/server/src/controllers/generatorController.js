import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';

let isGenerating = false;

export const generateDrafts = async (req, res) => {
    if (isGenerating) {
        return res.status(423).json({ error: 'Generation already in progress.' });
    }

    isGenerating = true;

    try {
        console.log('Starting draft generation with Dynamic Session Builder...');

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
        
        // Fact Expansion for Sessions
        courses.forEach(c => {
            if (c.theorySessions?.length) {
                c.theorySessions.forEach((duration, i) => {
                    facts += `course(id_${c._id}_T_${i}, theory, ${duration}, ${duration}).\n`;
                });
            }
            if (c.labSessions?.length) {
                c.labSessions.forEach((duration, i) => {
                    facts += `course(id_${c._id}_L_${i}, lab, ${duration}, ${duration}).\n`;
                });
            }
        });

        assignments.forEach(a => {
            const course = courses.find(c => c._id.toString() === a.courseId.toString());
            if (!course) return;

            // Theory Sessions Mappings
            if (course.theorySessions?.length && a.theoryTeacherIds?.length) {
                course.theorySessions.forEach((_, i) => {
                    const subId = `id_${course._id}_T_${i}`;
                    facts += `section_course(id_${a.sectionId}, ${subId}).\n`;
                    facts += `allowed_teachers(${subId}, id_${a.sectionId}, [${a.theoryTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
                });
            }

            // Lab Sessions Mappings
            if (course.labSessions?.length && a.labTeacherIds?.length) {
                course.labSessions.forEach((_, i) => {
                    const subId = `id_${course._id}_L_${i}`;
                    facts += `section_course(id_${a.sectionId}, ${subId}).\n`;
                    facts += `allowed_teachers(${subId}, id_${a.sectionId}, [${a.labTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
                });
            }
        });

        // Unavailability
        teachers.forEach(t => t.unavailableSlots?.forEach(s => facts += `unavailable(id_${t._id}, ${s.day}, ${s.slot}).\n`));
        
        facts += '\n% The Grid\n';
        facts += 'day(mon). day(tue). day(wed). day(thu). day(fri).\n';
        facts += 'slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n';

        // 2. Execute solver
        console.log('Executing solver...');
        const engineResponse = await executePrologSolver(facts);

        if (!engineResponse || !engineResponse.drafts) {
            throw new Error('Solver failed to return valid JSON.');
        }

        // 3. Result Parsing (Mapping back to original CID and component)
        const cleanDrafts = engineResponse.drafts.map(draft => ({
            score: draft.score,
            timetable: draft.timetable.map(entry => {
                // Example rawId: id_123_T_0 or id_123_L_1
                const parts = entry.courseId.split('_');
                // parts[0] = id, parts[1] = CID, parts[2] = T/L, parts[3] = index
                const cid = parts[1];
                const componentCode = parts[2];
                
                const course = courses.find(c => c._id.toString() === cid);
                const teacher = teachers.find(t => t._id.toString() === entry.teacherId.replace('id_', ''));
                const section = sections.find(s => s._id.toString() === entry.sectionId.replace('id_', ''));
                const room    = rooms.find(r => r._id.toString() === entry.roomId.replace('id_', ''));

                return {
                    sectionId: entry.sectionId.replace('id_', ''),
                    sectionName: section?.name || 'Unknown',
                    courseId: cid,
                    courseName: course?.name || 'Unknown',
                    teacherId: entry.teacherId.replace('id_', ''),
                    teacherName: teacher?.name || 'Unknown',
                    roomId: entry.roomId.replace('id_', ''),
                    roomName: room?.name || 'Unknown',
                    day: entry.day,
                    slot: entry.slot,
                    component: componentCode === 'T' ? 'theory' : 'lab'
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
