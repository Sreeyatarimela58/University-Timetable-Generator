import * as models from '../models/index.js';

const getModel = (entityName) => {
    // Map lowercase plural or singular names to precise Model names
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
        const Model = getModel(req.params.entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        const data = await Model.find();
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
    try {
        const Model = getModel(req.params.entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        const newRecord = new Model(req.body);
        const saved = await newRecord.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const update = async (req, res) => {
    try {
        const Model = getModel(req.params.entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Record not found' });
        
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const remove = async (req, res) => {
    try {
        const Model = getModel(req.params.entity);
        if (!Model) return res.status(404).json({ error: 'Entity not found' });
        
        const deleted = await Model.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Record not found' });
        
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
