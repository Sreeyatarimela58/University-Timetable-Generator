import mongoose from 'mongoose';

const generationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'LOCKED', 'ARCHIVED'],
        default: 'ACTIVE'
    }
}, { timestamps: true });

export const Generation = mongoose.model('Generation', generationSchema);
