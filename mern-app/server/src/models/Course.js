import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    yearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
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
        trim: true
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
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Correct uniqueness: Code must be unique WITHIN a year, not globally.
courseSchema.index({ yearId: 1, code: 1 }, { unique: true });

// Validation helper could be added here, but we'll enforce it in the controller/frontend
export const Course = mongoose.model('Course', courseSchema);
