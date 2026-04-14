import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
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
    isLocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Timetable = mongoose.model('Timetable', timetableSchema);
