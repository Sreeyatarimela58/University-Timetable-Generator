import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    durationYears: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    }
}, { timestamps: true });

export const Program = mongoose.model('Program', programSchema);
