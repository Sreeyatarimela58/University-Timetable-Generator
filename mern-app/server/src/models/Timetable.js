import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
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
    generationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Generation',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    day: {
        type: String,
        enum: ['mon', 'tue', 'wed', 'thu', 'fri'],
        required: true
    },
    slot: {
        type: Number,
        min: 1,
        max: 8,
        required: true
    },
    component: {
        type: String,
        enum: ['theory', 'lab'],
        required: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date
    }
}, { timestamps: true });

export const Timetable = mongoose.model('Timetable', timetableSchema);
