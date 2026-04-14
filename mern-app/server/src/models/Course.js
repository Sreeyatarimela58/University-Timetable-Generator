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
    // New Session Builder Schema
    theoryTotal: {
        type: Number,
        default: 0
    },
    theorySessions: [{
        type: Number
    }],
    labTotal: {
        type: Number,
        default: 0
    },
    labSessions: [{
        type: Number
    }]
}, { timestamps: true });

// Validation helper could be added here, but we'll enforce it in the controller/frontend
export const Course = mongoose.model('Course', courseSchema);
