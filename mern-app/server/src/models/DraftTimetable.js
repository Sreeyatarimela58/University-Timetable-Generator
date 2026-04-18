import mongoose from 'mongoose';

const timetableEntrySchema = new mongoose.Schema({
    sectionId: String,
    programId: String,
    yearId: String,
    sectionName: String,
    courseId: String,
    courseName: String,
    teacherId: String,
    teacherName: String,
    roomId: String,
    roomName: String,
    day: String,
    slot: Number,
    component: String,
    status: { type: Number, default: 1 }, // 1 = scheduled, 0 = unscheduled
    risk: String,
    riskConfirmed: Boolean,
    reason: String,
    suggestion: {
        primary: String,
        secondary: String,
        severity: String
    }
}, { _id: false });

const draftSchema = new mongoose.Schema({
    status: { type: String, enum: ['success', 'partial', 'infeasible'], default: 'success' },
    solverState: { type: String, enum: ['optimal', 'partial', 'timeout_recovery', 'infeasible'], default: 'optimal' },
    
    scheduled: [timetableEntrySchema],
    unscheduled: [timetableEntrySchema],
    timetable: [timetableEntrySchema], // Backwards compatibility if needed

    summary: {
        total: Number,
        scheduled: Number,
        unscheduled: Number,
        qualityScore: Number,
        weightedScore: Number,
        penaltyScore: Number,
        confidence: Number,
        trustScore: Number
    },

    analytics: {
        failureSummary: mongoose.Schema.Types.Mixed,
        topBottleneck: String,
        bottleneckImpact: Number,
        bottleneckContext: {
            affectedSections: [String],
            topAffectedCourses: [mongoose.Schema.Types.Mixed] // { courseId, failureCount }
        },
        stabilityScore: Number,
        riskStats: {
            truePositive: Number,
            falsePositive: Number,
            falseNegative: Number,
            precision: Number,
            recall: Number
        }
    },

    systemHealth: {
        status: { type: String, enum: ['healthy', 'strained', 'degraded', 'critical_degraded', 'critical'] },
        reason: String
    },

    meta: {
        runId: String,
        generationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Generation' },
        solutionHash: String,
        solverTimeMs: Number,
        asyncTimeMs: Number,
        iterationsCount: Number,
        stabilityPending: { type: Boolean, default: true },
        lastUpdatedAt: { type: Date, default: Date.now }
    },

    auditLog: [{
        runId: String,
        qualityScore: Number,
        stabilityScore: Number,
        trustScore: Number,
        timestamp: { type: Date, default: Date.now }
    }]
}, { _id: false });

const draftTimetableSchema = new mongoose.Schema({
    drafts: [draftSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24h TTL
});

// Middleware to cap auditLog array globally across updates natively if needed
// Or we cap it at generation time: {$push: { auditLog: { $each: [...], $slice: -20 } }} natively via Mongoose.

export const DraftTimetable = mongoose.model('DraftTimetable', draftTimetableSchema);
