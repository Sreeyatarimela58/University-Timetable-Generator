import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    yearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true
    },
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    strength: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const Section = mongoose.model('Section', sectionSchema);
