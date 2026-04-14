import * as models from '../models/index.js';
import mongoose from 'mongoose';

const getModel = (entityName) => {
    const modelMap = {
        programs: models.Program,
        academicyears: models.AcademicYear,
        sections: models.Section,
        rooms: models.Room,
        teachers: models.Teacher,
        students: models.Student,
        courses: models.Course,
        courseassignments: models.CourseAssignment,
        timetables: models.Timetable
    };
    return modelMap[entityName.toLowerCase()];
};

export const getAll = async (req, res) => {
    try {
        const entity = req.params.entity.toLowerCase();
        const Model = getModel(entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        // Final Model Filtering: Only pull active for non-immutable entities if they use isActive
        // But per latest pivot, we only filter if the flag exists.
        let query = Model.find();

        if (entity === 'academicyears') {
            query = query.populate('programId');
        } else if (entity === 'sections') {
            query = query.populate({
                path: 'yearId',
                populate: { path: 'programId' }
            });
        } else if (entity === 'courses') {
            query = query.populate('programId');
        } else if (entity === 'courseassignments') {
            query = query.populate('courseId sectionId theoryTeacherIds labTeacherIds');
        }

        const data = await query.exec();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getById = async (req, res) => {
    try {
        const Model = getModel(req.params.entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        const data = await Model.findById(req.params.id);
        if (!data) return res.status(404).json({ error: 'Record not found' });
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const create = async (req, res) => {
    const entity = req.params.entity.toLowerCase();
    const Model = getModel(entity);
    if (!Model) return res.status(404).json({ error: 'Entity not found' });

    // Handle Atomic Program + Year Generation
    if (entity === 'programs') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { name, durationYears } = req.body;
            
            // 1. Create Program
            const program = new models.Program({ name, durationYears });
            const savedProgram = await program.save({ session });

            // 2. Generate Academic Years
            const yearsToCreate = [];
            for (let i = 1; i <= durationYears; i++) {
                yearsToCreate.push({
                    programId: savedProgram._id,
                    yearNumber: i
                });
            }
            await models.AcademicYear.insertMany(yearsToCreate, { session });

            await session.commitTransaction();
            return res.status(201).json(savedProgram);
        } catch (err) {
            await session.abortTransaction();
            return res.status(400).json({ error: err.message });
        } finally {
            session.endSession();
        }
    }

    // Standard Creation with Uniqueness for Sections
    if (entity === 'sections') {
        try {
            const { yearId, name } = req.body;
            const exists = await models.Section.findOne({ yearId, name });
            if (exists) return res.status(400).json({ error: 'Section already exists in this year.' });
        } catch (e) {}
    }

    try {
        const newRecord = new Model(req.body);
        const saved = await newRecord.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const update = async (req, res) => {
    try {
        const entity = req.params.entity.toLowerCase();
        const Model = getModel(entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });

        // IMMUTABILITY GUARD
        if (entity === 'programs' || entity === 'academicyears') {
            return res.status(403).json({ error: 'Academic structure is immutable after creation.' });
        }

        if (entity === 'sections') {
            // Only allow editing "strength"
            const allowed = ['strength'];
            const attempted = Object.keys(req.body);
            const isIllegal = attempted.some(key => !allowed.includes(key));
            
            if (isIllegal) {
                return res.status(403).json({ error: 'Only section strength can be modified. Name and Year are immutable.' });
            }
        }
        
        const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Record not found' });
        
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const remove = async (req, res) => {
    try {
        const entity = req.params.entity.toLowerCase();
        const Model = getModel(entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });

        // IMMUTABILITY GUARD
        if (entity === 'programs' || entity === 'academicyears' || entity === 'sections') {
            return res.status(403).json({ error: 'Academic structure (Programs, Years, Sections) is immutable.' });
        }
        
        const deleted = await Model.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Record not found' });
        
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
