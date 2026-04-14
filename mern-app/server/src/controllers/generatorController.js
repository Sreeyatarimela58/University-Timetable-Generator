import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';

export const generateTimetable = async (req, res) => {
    try {
        console.log("Starting generation process...");
        // 1. Fetch entire database state
        const teachers = await models.Teacher.find();
        const rooms = await models.Room.find();
        const sections = await models.Section.find();
        const courses = await models.Course.find();
        const assignments = await models.CourseAssignment.find();
        const lockedSlots = await models.Timetable.find({ isLocked: true });

        // 2. Transpile & Format exactly as the doc specifies
        let facts = "";
        
        // Base Entities
        facts += "% Base Entities\n";
        teachers.forEach(t => facts += `teacher(id_${t._id}, ${t.maxHoursPerWeek}).\n`);
        rooms.forEach(r => facts += `room(id_${r._id}, ${r.type}, ${r.capacity}).\n`);
        sections.forEach(s => facts += `section(id_${s._id}, ${s.strength}).\n`);
        courses.forEach(c => facts += `course(id_${c._id}, ${c.type}, ${c.hoursPerWeek}, ${c.consecutiveSlotsRequired}).\n`);
        
        facts += "\n% Relational Mappings\n";
        assignments.forEach(a => {
             facts += `section_course(id_${a.sectionId}, id_${a.courseId}).\n`;
             // Construct prolog list for allowed_teachers
             const teacherList = a.teacherIds.map(tid => `id_${tid}`).join(', ');
             facts += `allowed_teachers(id_${a.courseId}, id_${a.sectionId}, [${teacherList}]).\n`;
        });

        facts += "\n% Boundary Constraints\n";
        teachers.forEach(t => {
             t.unavailableSlots.forEach(slotObj => {
                facts += `unavailable(id_${t._id}, ${slotObj.day}, ${slotObj.slot}).\n`;
             });
        });

        facts += "\n% Locked Assignments\n";
        lockedSlots.forEach(l => {
             facts += `locked_assignment(id_${l.sectionId}, id_${l.courseId}, ${l.day}, ${l.slot}).\n`;
        });

        facts += "\n% The Grid\n";
        facts += "day(mon). day(tue). day(wed). day(thu). day(fri).\n";
        facts += "slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n";

        // 3. Execution Phase
        console.log("Executing prolog constraints solver...");
        console.log(facts);
        const engineResponse = await executePrologSolver(facts);
        
        // 4. Persistence Phase
        if(engineResponse && engineResponse.status === "success" && engineResponse.timetable) {
             // Delete old unlocked timetable entries
             await models.Timetable.deleteMany({ isLocked: false });

             // Map back and save
             const newTimetable = engineResponse.timetable.map(t => ({
                 sectionId: t.sectionId.replace('id_', ''),
                 courseId: t.courseId.replace('id_', ''),
                 teacherId: t.teacherId.replace('id_', ''),
                 roomId: t.roomId.replace('id_', ''),
                 day: t.day,
                 slot: t.slot,
                 isLocked: false
             }));

             await models.Timetable.insertMany(newTimetable);
             return res.json({ message: "Timetable generated successfully", metadata: engineResponse });
        } else {
             return res.status(500).json({ error: "Solver responded without success flag", full_response: engineResponse });
        }

    } catch(err) {
        console.error("Generator Error =>", err);
        res.status(500).json({ error: err.message || 'Generation failed' });
    }
};
