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
    teacherIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    }]
}, { timestamps: true });

export const CourseAssignment = mongoose.model('CourseAssignment', courseAssignmentSchema);
