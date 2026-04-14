import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import jwt from 'jsonwebtoken';

const generateToken = (id, role, profileId) => {
    return jwt.sign({ id, role, profileId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const login = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const user = await User.findOne({ username, role });

        if (user && (await user.comparePassword(password))) {
            const responseData = {
                _id: user._id,
                username: user.username,
                role: user.role,
                profileId: user.profileId,
                token: generateToken(user._id, user.role, user.profileId),
            };

            // For students, resolve their sectionId from the Student record
            if (role === 'student' && user.profileId) {
                const student = await Student.findById(user.profileId);
                if (student) {
                    responseData.sectionId = student.sectionId;
                    responseData.studentName = student.name;
                }
            }

            res.json(responseData);
        } else {
            res.status(401).json({ error: 'Invalid credentials or role mismatch' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Auto seed the dev admin on boot
export const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: 'password123',
                role: 'admin'
            });
            console.log('Default Admin Account Seeded (u: admin, p: password123)');
        }
    } catch(err) {
        console.error('Failed to seed admin', err);
    }
};
