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
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    theoryHours: {
        type: Number,
        default: 0
    },
    labHours: {
        type: Number,
        default: 0
    },
    theoryConsecutive: {
        type: Number,
        default: 1
    },
    labConsecutive: {
        type: Number,
        default: 2
    }
}, { timestamps: true });

export const Course = mongoose.model('Course', courseSchema);
