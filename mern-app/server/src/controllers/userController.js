import { User } from '../models/User.js';
import * as models from '../models/index.js';

export const createUser = async (req, res) => {
    const { username, password, role, name, sectionId } = req.body;

    try {
        // 1. Check if user already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: 'User with this ID already exists' });
        }

        let newProfileId = null;

        // 2. Create the Domain Entity (Student or Teacher)
        if (role === 'student') {
            if (!name || !sectionId) return res.status(400).json({ error: "Name and Section are required for students" });
            
            const student = await models.Student.create({
                name,
                rollNumber: username,
                sectionId
            });
            newProfileId = student._id;
        } 
        else if (role === 'prof') {
            if (!name) return res.status(400).json({ error: "Name is required for professors" });
            
            const teacher = await models.Teacher.create({
                name,
                maxHoursPerWeek: 20 // Default
            });
            newProfileId = teacher._id;
        } 
        else {
            return res.status(400).json({ error: "Invalid role" });
        }

        // 3. Create the Authentication User linked to the new profile
        const user = await User.create({
            username, // This is the ID No
            password,
            role,
            profileId: newProfileId
        });

        res.status(201).json({
            message: "Profile and User account created successfully",
            username: user.username,
            role: user.role
        });

    } catch (error) {
        console.error('Provisioning Error:', error);
        res.status(500).json({ error: error.message || 'Error provisioning account' });
    }
};

export const listUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json(users);
    } catch(err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
