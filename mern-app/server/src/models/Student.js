import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rollNumber: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String
    },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        default: null
    },
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program',
        default: null
    },
    yearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        default: null
    }
}, { timestamps: true });

export const Student = mongoose.model('Student', studentSchema);
