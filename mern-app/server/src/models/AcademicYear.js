import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    yearNumber: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);
