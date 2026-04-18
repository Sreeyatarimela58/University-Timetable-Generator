import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    maxHoursPerWeek: {
        type: Number,
        required: true
    },
    specialization: {
        type: String,
        enum: ['CSE', 'ECE', 'MBA']
    },
    unavailableSlots: [{
        day: {
            type: String,
            enum: ['mon', 'tue', 'wed', 'thu', 'fri']
        },
        slot: {
            type: Number,
            min: 1,
            max: 8
        }
    }]
}, { timestamps: true });

export const Teacher = mongoose.model('Teacher', teacherSchema);
