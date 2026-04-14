import mongoose from 'mongoose';

const timetableEntrySchema = new mongoose.Schema({
    sectionId: String,
    courseId: String,
    teacherId: String,
    roomId: String,
    day: String,
    slot: Number,
}, { _id: false });

const draftSchema = new mongoose.Schema({
    score: { type: Number, required: true },
    timetable: [timetableEntrySchema]
}, { _id: false });

const draftTimetableSchema = new mongoose.Schema({
    drafts: [draftSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24h TTL
});

export const DraftTimetable = mongoose.model('DraftTimetable', draftTimetableSchema);
