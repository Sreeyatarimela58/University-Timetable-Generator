import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    yearNumber: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['theory', 'lab'],
        required: true
    },
    hoursPerWeek: {
        type: Number,
        required: true
    },
    consecutiveSlotsRequired: {
        type: Number,
        required: true,
        default: 1
    }
}, { timestamps: true });

export const Course = mongoose.model('Course', courseSchema);
