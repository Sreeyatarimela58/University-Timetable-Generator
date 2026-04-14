import { User } from '../models/User.js';
import * as models from '../models/index.js';

export const createUser = async (req, res) => {
    const { username, password, role, profileId } = req.body;

    try {
        // Enforce validations that profile references valid records
        if(role === 'student') {
            const valid = await models.Section.findById(profileId);
            if(!valid) return res.status(400).json({error: "Invalid Section profileId provided"});
        } else if (role === 'prof') {
            const valid = await models.Teacher.findById(profileId);
            if(!valid) return res.status(400).json({error: "Invalid Teacher profileId provided"});
        } else {
            return res.status(400).json({error: "Only student and prof profiles can be created"});
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = await User.create({
            username,
            password,
            role,
            profileId
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            profileId: user.profileId
        });
    } catch (error) {
        res.status(500).json({ error: 'Error provisioning user' });
    }
};

// Utility to list current users in the admin dashboard
export const listUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json(users);
    } catch(err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
