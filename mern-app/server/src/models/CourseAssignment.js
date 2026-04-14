import mongoose from 'mongoose';

const courseAssignmentSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    theoryTeacherIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    }],
    labTeacherIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const CourseAssignment = mongoose.model('CourseAssignment', courseAssignmentSchema);
