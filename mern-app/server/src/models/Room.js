import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['classroom', 'lab'],
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 15,
        max: 120
    }
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
