import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

let isGenerating = false;

const HEALTH_CONFIG = {
    healthy: { minQuality: 0.9, maxFailure: 0.1 },
    strained: { minQuality: 0.7 }
};

const DEGRADATION_CONFIG = {
    warning: -0.10,
    critical: -0.20
};

const MAX_STABILITY_WAIT = 30000;
const MAX_WORKERS = 3;
let activeWorkers = 0;
const workerQueue = [];

const processQueue = () => {
    if (activeWorkers >= MAX_WORKERS || workerQueue.length === 0) return;
    const job = workerQueue.shift();
    activeWorkers++;
    job().finally(() => {
        activeWorkers--;
        processQueue();
    });
};

const DAYS_LENGTH = 5;
const SLOTS_LENGTH = 8;
const maxRoomSlots = DAYS_LENGTH * SLOTS_LENGTH;

const safeId = (id) => `id_${id.toString().replace(/[^a-zA-Z0-9]/g, '')}`;

const generateSystemFacts = (teachers, rooms, sections, courses, assignments, teacherBlockSet = new Set(), roomBlockSet = new Set()) => {
    let facts = ':- discontiguous section_course/2.\n:- discontiguous allowed_teachers/3.\n\n';
    
    teachers.forEach(t => facts += `teacher(${safeId(t._id)}, ${t.maxHoursPerWeek}).\n`);
    rooms.forEach(r => facts += `room(${safeId(r._id)}, ${r.type}, ${r.capacity}).\n`);
    sections.forEach(s => facts += `section(${safeId(s._id)}, ${s.strength}).\n`);
    
    courses.forEach(c => {
        if (c.theorySessions?.length) {
            c.theorySessions.forEach((duration, i) => facts += `course(${safeId(c._id)}_T_${i}, theory, ${duration}, ${duration}).\n`);
        }
        if (c.labSessions?.length) {
            c.labSessions.forEach((duration, i) => facts += `course(${safeId(c._id)}_L_${i}, lab, ${duration}, ${duration}).\n`);
        }
    });

    assignments.forEach(a => {
        const course = courses.find(c => c._id.toString() === a.courseId.toString());
        if (!course) return;

        if (course.theorySessions?.length && a.theoryTeacherIds?.length) {
            course.theorySessions.forEach((_, i) => {
                const subId = `${safeId(course._id)}_T_${i}`;
                facts += `section_course(${safeId(a.sectionId)}, ${subId}).\n`;
                facts += `allowed_teachers(${subId}, ${safeId(a.sectionId)}, [${a.theoryTeacherIds.map(id => safeId(id)).join(', ')}]).\n`;
            });
        }

        if (course.labSessions?.length && a.labTeacherIds?.length) {
            course.labSessions.forEach((_, i) => {
                const subId = `${safeId(course._id)}_L_${i}`;
                facts += `section_course(${safeId(a.sectionId)}, ${subId}).\n`;
                facts += `allowed_teachers(${subId}, ${safeId(a.sectionId)}, [${a.labTeacherIds.map(id => safeId(id)).join(', ')}]).\n`;
            });
        }
    });

    teachers.forEach(t => t.unavailableSlots?.forEach(s => facts += `unavailable(${safeId(t._id)}, ${s.day}, ${s.slot}).\n`));
    
    teacherBlockSet.forEach(block => {
        const [tid, d, s] = block.split('-');
        facts += `unavailable(${safeId(tid)}, ${d}, ${s}).\n`;
    });
    roomBlockSet.forEach(block => {
        const [rid, d, s] = block.split('-');
        facts += `unavailable_room(${safeId(rid)}, ${d}, ${s}).\n`;
    });

    facts += '\n% The Grid\n';
    facts += 'day(mon). day(tue). day(wed). day(thu). day(fri).\n';
    facts += 'slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n';
    return facts;
};

const activeRequests = new Map();

export const generateDrafts = async (req, res) => {
    const { programId, yearId, mode } = req.body || {};
    if (mode === 'global') {
        return await generateGlobalDraftsCore(req, res);
    }
    if (!programId || !yearId) return res.status(400).json({ error: 'programId and yearId are required for target scoping.' });

    const generation = await models.Generation.findOne({ status: 'ACTIVE' });
    if (!generation) return res.status(400).json({ error: 'No ACTIVE generation cycle found.' });
    const generationId = generation._id;

    const requestKey = `${programId}-${yearId}-${generationId}`;
    if (activeRequests.has(requestKey) && Date.now() - activeRequests.get(requestKey) < 5000) {
        return res.status(429).json({ error: 'Duplicate generation request blocked.' });
    }
    activeRequests.set(requestKey, Date.now());
    setTimeout(() => activeRequests.delete(requestKey), 5000);

    if (isGenerating) {
        return res.status(423).json({ error: 'Generation already in progress.' });
    }

    const pendingDrafts = await models.DraftTimetable.countDocuments();
    if (pendingDrafts > 0) return res.status(400).json({ error: 'Please publish or clear pending drafts before generating new scopes.' });

    isGenerating = true;

    // Fetch baseline for degradation tracking
    const baselineRuns = await models.DraftTimetable.find().sort({createdAt: -1}).limit(10);
    let baselineAvg = null;
    if (baselineRuns.length >= 3) {
        let sum = 0, count = 0;
        baselineRuns.forEach(r => {
            if (r.drafts && r.drafts[0]) {
                sum += r.drafts[0].summary.qualityScore || 0;
                count++;
            }
        });
        if (count > 0) baselineAvg = sum / count;
    }

    let totalSessions = 0, totalSlots = 0;

    try { // OUTER try — guarantees isGenerating reset in finally
        console.log(`Starting targeted drift generation for Program: ${programId}, Year: ${yearId}`);
        const sections = await models.Section.find({ programId, yearId });
        if (!sections.length) return res.status(400).json({ error: 'No sections found for target scope.' });
        
        const sectionIds = sections.map(s => s._id);
        let assignments = await models.CourseAssignment.find({ sectionId: { $in: sectionIds } });
        const courses = await models.Course.find(); 

        const teacherIdsSet = new Set();
        assignments.forEach(a => {
             if (a.theoryTeacherIds) a.theoryTeacherIds.forEach(t => teacherIdsSet.add(t.toString()));
             if (a.labTeacherIds) a.labTeacherIds.forEach(t => teacherIdsSet.add(t.toString()));
        });
        const teacherIdsArr = Array.from(teacherIdsSet);
        const teachers = await models.Teacher.find({ _id: { $in: teacherIdsArr } });
        
        const rooms = await models.Room.find();
        const roomIdsArr = rooms.map(r => r._id.toString());

        if (!teachers.length || !rooms.length || !sections.length || !courses.length) {
            return res.status(400).json({ error: 'Insufficient data for generation.' });
        }

        // --- CONSTRAINT PROJECTION OVERLAY ---
        const external = await models.Timetable.find({
            generationId: generationId,
            $and: [
                {
                    $or: [
                        { teacherId: { $in: teacherIdsArr } },
                        { roomId: { $in: roomIdsArr } }
                    ]
                },
                {
                    $or: [
                        { programId: { $ne: programId } },
                        { yearId: { $ne: yearId } }
                    ]
                }
            ]
        });

        const teacherBlockSet = new Set();
        const roomBlockSet = new Set();

        external.forEach(e => {
            if (teacherIdsArr.includes(e.teacherId.toString())) {
                teacherBlockSet.add(`${e.teacherId}-${e.day}-${e.slot}`);
            }
            if (roomIdsArr.includes(e.roomId.toString())) {
                roomBlockSet.add(`${e.roomId}-${e.day}-${e.slot}`);
            }
        });

        const availabilityScore = (tid) => {
            let blocked = 0;
            teacherBlockSet.forEach(b => { if (b.startsWith(tid)) blocked++; });
            const teacher = teachers.find(t => t._id.toString() === tid);
            if (teacher && teacher.unavailableSlots) blocked += teacher.unavailableSlots.length;
            return blocked;
        };

        assignments.forEach(a => {
            if (a.theoryTeacherIds) a.theoryTeacherIds.sort((t1, t2) => availabilityScore(t1.toString()) - availabilityScore(t2.toString()));
            if (a.labTeacherIds) a.labTeacherIds.sort((t1, t2) => availabilityScore(t1.toString()) - availabilityScore(t2.toString()));
        });
        // -------------------------------------

        totalSlots = rooms.length * maxRoomSlots;
        totalSessions = assignments.reduce((acc, a) => {
            const course = courses.find(c => c._id.toString() === a.courseId.toString());
            if (!course) return acc;
            const tHrs = course.theorySessions?.reduce((sum, h) => sum + h, 0) || 0;
            const lHrs = course.labSessions?.reduce((sum, h) => sum + h, 0) || 0;
            return acc + tHrs + lHrs;
        }, 0);

        if (totalSessions > totalSlots) throw new Error("INSUFFICIENT ROOM CAPACITY");

        assignments = faker.helpers.shuffle(assignments);
        const getDifficultyScore = (a) => {
            const course = courses.find(c => c._id.toString() === a.courseId.toString());
            const hoursPerWeek = (course?.theorySessions?.reduce((sum, h) => sum + h, 0) || 0) + (course?.labSessions?.reduce((sum, h) => sum + h, 0) || 0);
            const isLab = (course?.labSessions?.length || 0) > 0;
            const teacherPoolSize = (a.theoryTeacherIds?.length || 0) + (a.labTeacherIds?.length || 0);
            return (isLab ? 10 : 2) + (hoursPerWeek * 3) - (teacherPoolSize * 2);
        };
        assignments.sort((a, b) => getDifficultyScore(b) - getDifficultyScore(a));

        const facts = generateSystemFacts(teachers, rooms, sections, courses, assignments, teacherBlockSet, roomBlockSet);
        
        console.log('Executing primary solver...');
        let engineResponse = await executePrologSolver(facts);
        if (!engineResponse || !engineResponse.drafts) throw new Error('Solver failed to return valid JSON.');
        let solverMode = "STRICT";

        if (engineResponse.solverState === 'timeout_recovery' || engineResponse.solverState === 'infeasible') {
            console.log('Primary solver boundaries breached. Initiating Layer-2 Relaxed Solve...');
            const relaxedFacts = facts + '\nrelax_fatigue.\nrelax_lunch.\n';
            const relaxedResponse = await executePrologSolver(relaxedFacts);
            if (relaxedResponse && relaxedResponse.drafts && relaxedResponse.drafts.length > 0) {
                 engineResponse = relaxedResponse;
                 if (engineResponse.solverState === 'infeasible' || engineResponse.solverState === 'timeout_recovery') {
                     solverMode = "FAILED";
                 } else {
                     solverMode = "RELAXED_FATIGUE";
                 }
            } else {
                 solverMode = "FAILED";
            }
        }

        const teacherBlockDensity = teachers.length > 0 ? (teacherBlockSet.size / (teachers.length * maxRoomSlots)) : 0;
        const roomBlockDensity = rooms.length > 0 ? (roomBlockSet.size / (rooms.length * maxRoomSlots)) : 0;
        const constraintSaturation = totalSlots > 0 ? ((teacherBlockSet.size + roomBlockSet.size) / (totalSlots * 2)) : 0;

        // Slot spread score: measure how evenly blocks are distributed across (day, slot) pairs.
        // A score near 1 = evenly spread (solvable); near 0 = clustered (risky even at low saturation).
        const slotBuckets = new Map();
        [...teacherBlockSet, ...roomBlockSet].forEach(key => {
            const parts = key.split('-');
            const bucket = `${parts[1]}-${parts[2]}`; // day-slot
            slotBuckets.set(bucket, (slotBuckets.get(bucket) || 0) + 1);
        });
        const totalBlocks = teacherBlockSet.size + roomBlockSet.size;
        const maxBucketSize = slotBuckets.size > 0 ? Math.max(...slotBuckets.values()) : 1;
        const slotSpreadScore = totalBlocks > 0 ? parseFloat((1 - (maxBucketSize / totalBlocks)).toFixed(3)) : 1.0;

        const solverStartTime = Date.now();
        const cleanDrafts = engineResponse.drafts.map(draft => {
            const currentRunId = crypto.randomUUID();
            
            const scheduled = [];
            const unscheduled = [];
            const failureSummary = {
                roomContentions: 0, teacherContentions: 0, constraintDeadlocks: 0, noRooms: 0, noTeachers: 0
            };

            let totalWeight = 0, scheduledWeight = 0, unscheduledWeight = 0;
            let tp = 0, fp = 0, fn = 0;

            draft.timetable.forEach(entry => {
                const parts = entry.courseId.split('_');
                const cid = parts[1];
                const componentCode = parts[2];
                
                const course = courses.find(c => c._id.toString() === cid);
                const teacher = teachers.find(t => t._id.toString() === (entry.teacherId === 'none' ? '' : entry.teacherId.replace('id_', '')));
                const section = sections.find(s => s._id.toString() === entry.sectionId.replace('id_', ''));
                const room    = rooms.find(r => r._id.toString() === (entry.roomId === 'none' ? '' : entry.roomId.replace('id_', '')));

                const weight = componentCode === 'T' ? 1.0 : 2.0;
                totalWeight += weight;

                const assignment = assignments.find(a => a.sectionId.toString() === entry.sectionId.replace('id_', '') && a.courseId.toString() === cid);
                const teacherPool = componentCode === 'T' ? (assignment?.theoryTeacherIds || []) : (assignment?.labTeacherIds || []);
                const roomOptions = rooms.filter(r => r.capacity >= (section?.strength || 0) && (componentCode === 'T' ? r.type === 'classroom' : r.type === 'lab'));
                
                const risk = (teacherPool.length === 1 || roomOptions.length <= 1) ? "high" : undefined;
                const sectionSize = section?.strength || 0;

                const mappedEntry = {
                    sectionId: entry.sectionId.replace('id_', ''), sectionName: section?.name || 'Unknown',
                    programId, yearId,
                    courseId: cid, courseName: course?.name || 'Unknown',
                    teacherId: entry.teacherId === 'none' ? null : entry.teacherId.replace('id_', ''), teacherName: entry.teacherId === 'none' ? 'None' : (teacher?.name || 'Unknown'),
                    roomId: entry.roomId === 'none' ? null : entry.roomId.replace('id_', ''), roomName: entry.roomId === 'none' ? 'None' : (room?.name || 'Unknown'),
                    day: entry.day, slot: entry.slot, component: componentCode === 'T' ? 'theory' : 'lab',
                    status: entry.status ?? 1, risk
                };

                if (mappedEntry.status === 1) {
                    scheduled.push(mappedEntry);
                    scheduledWeight += weight;
                    if (risk === "high") fp++; 
                } else {
                    unscheduledWeight += weight;
                    if (risk === "high") { mappedEntry.riskConfirmed = true; tp++; } else { fn++; }

                    let reason = "Constraint deadlock";
                    let suggestion = { primary: "Review grid constraints and overlaps", secondary: "Consider alternative time windows", severity: "medium" };

                    if (roomOptions.length === 0) {
                        reason = "No suitable room found (size/type mismatch)";
                        failureSummary.noRooms++;
                        if (sectionSize > 60) suggestion = { primary: "Reduce section size or split sections", secondary: "Add physically larger rooms", severity: "high" };
                        else suggestion = { primary: "Add more rooms matching type", secondary: "Review existing room constraints", severity: "high" };
                    } else if (teacherPool.length === 0) {
                        reason = "No teacher assigned";
                        failureSummary.noTeachers++;
                        suggestion = { primary: "Assign additional teachers to this course", secondary: "Update faculty pool mappings", severity: "high" };
                    } else {
                        const teachersInPool = teachers.filter(t => teacherPool.includes(t._id.toString()));
                        const allTeachersBusy = teachersInPool.every(t => {
                            const currentLoad = draft.timetable.filter(s => s.teacherId === `id_${t._id}` && s.status === 1).length;
                            return (currentLoad >= (t.maxHoursPerWeek || 0));
                        });

                        if (allTeachersBusy) {
                            reason = "Teacher resource contention";
                            failureSummary.teacherContentions++;
                            suggestion = { primary: "Increase maximum allowed hours for mapped faculty", secondary: "Expand faculty pool for this section", severity: "high" };
                        } else {
                            const allRoomsBusy = roomOptions.every(r => {
                                const currentRoomTally = draft.timetable.filter(s => s.roomId === `id_${r._id}` && s.status === 1).length;
                                return currentRoomTally >= maxRoomSlots;
                            });
                            
                            if (allRoomsBusy) {
                                reason = "Room resource contention";
                                failureSummary.roomContentions++;
                                suggestion = { primary: "Increase slot count or extend schedule length", secondary: "Procure additional physical spaces", severity: "high" };
                            } else {
                                failureSummary.constraintDeadlocks++;
                            }
                        }
                    }
                    
                    mappedEntry.reason = reason;
                    mappedEntry.suggestion = suggestion;
                    unscheduled.push(mappedEntry);
                }
            });

            const total = draft.timetable.length;
            const scheduledCount = scheduled.length;
            const unscheduledCount = unscheduled.length;

            const qualityScore = total > 0 ? (scheduledCount / total) : 0;
            const weightedScore = totalWeight > 0 ? (scheduledWeight / totalWeight) : 0;
            const penaltyScore = totalWeight > 0 ? (unscheduledWeight / totalWeight) : 0;
            const failureRate = total > 0 ? (unscheduledCount / total) : 0;

            const solverStateFallback = unscheduledCount === 0 ? "optimal" : (unscheduledCount === total ? "infeasible" : "partial");
            const solverState = engineResponse.solverState || solverStateFallback;
            const solverReliabilityMap = { optimal: 1.0, partial: 0.8, timeout_recovery: 0.6, infeasible: 0.2 };
            // Confidence: accounts for both scheduling ratio AND constraint pressure
            const confidence = parseFloat((qualityScore * (1 - constraintSaturation) * (solverReliabilityMap[solverState] || 0.5)).toFixed(3));
            const trustScore = Math.max(0, Math.min(1, (qualityScore * 0.4) + (confidence * 0.3))); // refined later by stability worker

            const hashSource = [...scheduled].sort((a, b) => (a.sectionId || "").localeCompare(b.sectionId || "") || (a.day || "").localeCompare(b.day || "") || (a.slot || 0) - (b.slot || 0))
                .map(s => `${s.courseId}-${s.teacherId}-${s.roomId}-${s.day}-${s.slot}`).join('|');
            const solutionHash = crypto.createHash('md5').update(hashSource).digest('hex');

            let maxScore = -1, topBottleneck = "None";
            Object.entries(failureSummary).forEach(([key, count]) => { 
                const currentDensity = (key === 'teacherContentions' || key === 'noTeachers') ? teacherBlockDensity : ((key === 'roomContentions' || key === 'noRooms') ? roomBlockDensity : 0);
                const currentScore = (count * 2) + (currentDensity * 5);
                if (currentScore > maxScore) { maxScore = currentScore; topBottleneck = key; } 
            });
            const bottleneckImpact = unscheduledCount > 0 ? parseFloat((maxScore / (unscheduledCount * 2)).toFixed(2)) : 0;

            const severityMap = { "low": 1, "medium": 2, "high": 3 };
            const affectedCourseTracker = {};
            const affectedSectionSet = new Set();

            unscheduled.forEach(u => {
                u.impactScore = bottleneckImpact * (severityMap[u.suggestion?.severity] || 1);
                
                let mappedKey = 'constraintDeadlocks';
                if (u.reason === "No suitable room found (size/type mismatch)") mappedKey = 'noRooms';
                else if (u.reason === "No teacher assigned") mappedKey = 'noTeachers';
                else if (u.reason === "Teacher resource contention") mappedKey = 'teacherContentions';
                else if (u.reason === "Room resource contention") mappedKey = 'roomContentions';

                if (mappedKey === topBottleneck) {
                    affectedSectionSet.add(u.sectionName);
                    if (!affectedCourseTracker[u.courseName]) affectedCourseTracker[u.courseName] = 0;
                    affectedCourseTracker[u.courseName]++;
                }
            });
            unscheduled.sort((a,b) => (b.impactScore !== a.impactScore) ? b.impactScore - a.impactScore : b.failureCount - a.failureCount);

            const topAffectedCourses = Object.entries(affectedCourseTracker).map(([name, count]) => ({ courseId: name, failureCount: count })).sort((a,b) => b.failureCount - a.failureCount);

            const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
            const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;

            let sysStatus = "critical";
            if (qualityScore >= HEALTH_CONFIG.healthy.minQuality && failureRate <= HEALTH_CONFIG.healthy.maxFailure) sysStatus = "healthy";
            else if (qualityScore >= HEALTH_CONFIG.strained.minQuality) sysStatus = "strained";
            
            if (baselineAvg !== null) {
                const normalizedDelta = (qualityScore - baselineAvg) / baselineAvg;
                let isDegraded = false;
                if (normalizedDelta <= DEGRADATION_CONFIG.critical) { sysStatus = "critical_degraded"; isDegraded = true; }
                else if (normalizedDelta <= DEGRADATION_CONFIG.warning) { sysStatus = "degraded"; isDegraded = true; }
                
                let historicalDegradations = isDegraded ? 1 : 0;
                baselineRuns.slice(0,3).forEach(r => {
                     if (r.drafts && r.drafts[0]) {
                          if (((r.drafts[0].summary.qualityScore || 0) - baselineAvg) / baselineAvg <= DEGRADATION_CONFIG.warning) historicalDegradations++;
                     }
                });
                
                if (historicalDegradations < 2 && isDegraded) {
                     if (qualityScore >= HEALTH_CONFIG.healthy.minQuality) sysStatus = "healthy";
                     else if (qualityScore >= HEALTH_CONFIG.strained.minQuality) sysStatus = "strained";
                     else sysStatus = "critical";
                }
            }

            let sysReason = unscheduledCount > 0 ? `${topBottleneck} (${(bottleneckImpact * 100).toFixed(0)}% mapped constraint)` : 'Nominal execution';
            // High saturation warning; also checks spread — clustered blocks are worse than spread ones
            if (constraintSaturation > 0.85 || (constraintSaturation > 0.6 && slotSpreadScore < 0.3)) {
                sysStatus = "strained";
                sysReason = slotSpreadScore < 0.3
                    ? `High constraint clustering (spread: ${slotSpreadScore}) — unsolvable slots likely`
                    : "High constraint density — results may degrade";
            }

            const solverTimeMs = Date.now() - solverStartTime;

            return {
                status: unscheduledCount > 0 ? (solverState === 'infeasible' ? 'infeasible' : 'partial') : 'success',
                solverState: solverState, scheduled, unscheduled,
                summary: { total, scheduled: scheduledCount, unscheduled: unscheduledCount, qualityScore, weightedScore, penaltyScore, confidence, trustScore },
                analytics: {
                    solverMode, constraintSaturation, 
                    spaceUtilization: totalSlots > 0 ? (scheduledCount / totalSlots) : 0,
                    slotSpreadScore, teacherBlockDensity, roomBlockDensity,
                    failureSummary, topBottleneck, bottleneckImpact,
                    bottleneckContext: { affectedSections: Array.from(affectedSectionSet), topAffectedCourses },
                    stabilityScore: 0,
                    riskStats: { truePositive: tp, falsePositive: fp, falseNegative: fn, precision, recall }
                },
                systemHealth: { status: sysStatus, reason: sysReason },
                meta: { runId: currentRunId, generationId: generationId, solutionHash, solverTimeMs, asyncTimeMs: 0, iterationsCount: 1, stabilityPending: true, lastUpdatedAt: Date.now() },
                auditLog: [{ runId: currentRunId, qualityScore, stabilityScore: 0, trustScore, timestamp: Date.now() }],
                timetable: scheduled 
            };
        });

        const draftDoc = await models.DraftTimetable.create({ drafts: cleanDrafts, createdBy: req.user._id });

        // Structured production log — critical for debugging generation issues
        const primaryDraft = cleanDrafts[0];
        console.info(JSON.stringify({
            event: 'GENERATION_COMPLETE',
            programId, yearId,
            generationId: generationId.toString(),
            solverMode,
            scheduledCount: primaryDraft.summary.scheduled,
            unscheduledCount: primaryDraft.summary.unscheduled,
            qualityScore: primaryDraft.summary.qualityScore,
            confidence: primaryDraft.summary.confidence,
            constraintSaturation: parseFloat(constraintSaturation.toFixed(3)),
            slotSpreadScore,
            topBottleneck: primaryDraft.analytics.topBottleneck,
            systemHealthStatus: primaryDraft.systemHealth.status,
            solverTimeMs: primaryDraft.meta.solverTimeMs,
        }));

        res.json({ draftId: draftDoc._id });
        
        workerQueue.push(async () => {
            const asyncStart = Date.now();
            try {
                const ogDraft = cleanDrafts[0]; 
                const ogHashArr = ogDraft.scheduled.map(s => `${s.courseId}-${s.teacherId}-${s.roomId}-${s.day}-${s.slot}`);
                let overlapCount = 0;
                
                for (let i = 0; i < 2; i++) {
                    const shuffledAssigns = faker.helpers.shuffle([...assignments]).sort((a, b) => {
                        return ((a.theoryTeacherIds?.length || 0) + (a.labTeacherIds?.length || 0)) - ((b.theoryTeacherIds?.length || 0) + (b.labTeacherIds?.length || 0));
                    });
                    
                    const runResp = await executePrologSolver(generateSystemFacts(teachers, rooms, sections, courses, shuffledAssigns, teacherBlockSet, roomBlockSet));
                    if (runResp && runResp.drafts && runResp.drafts.length > 0) {
                        const newHashArr = runResp.drafts[0].timetable.filter(t => (t.status ?? 1) === 1).map(s => {
                            const cidParts = s.courseId.split('_');
                            return `${cidParts[1]}-${s.teacherId === 'none' ? 'null' : s.teacherId.replace('id_', '')}-${s.roomId === 'none' ? 'null' : s.roomId.replace('id_', '')}-${s.day}-${s.slot}`;
                        });
                        newHashArr.forEach(h => { if (ogHashArr.includes(h)) overlapCount++; });
                    }
                }

                const totalPossible = ogHashArr.length * 2;
                const avgStability = totalPossible > 0 ? (overlapCount / totalPossible) : 1;
                const asyncTimeMs = Date.now() - asyncStart;

                const trustScoreFinal = Math.max(0, Math.min(1, (ogDraft.summary.qualityScore * 0.4) + (ogDraft.summary.confidence * 0.3) + (avgStability * 0.3)));
                
                await models.DraftTimetable.updateOne(
                    { _id: draftDoc._id, "drafts.meta.runId": ogDraft.meta.runId },
                    { 
                        $set: { 
                            "drafts.$.analytics.stabilityScore": avgStability,
                            "drafts.$.summary.trustScore": trustScoreFinal,
                            "drafts.$.meta.stabilityPending": false,
                            "drafts.$.meta.asyncTimeMs": asyncTimeMs,
                            "drafts.$.meta.iterationsCount": 3,
                            "drafts.$.meta.lastUpdatedAt": Date.now()
                        },
                        $push: {
                            "drafts.$.auditLog": { 
                                $each: [{
                                    runId: ogDraft.meta.runId,
                                    qualityScore: ogDraft.summary.qualityScore,
                                    stabilityScore: avgStability,
                                    trustScore: trustScoreFinal,
                                    timestamp: Date.now()
                                }],
                                $slice: -20
                            }
                        }
                    }
                );
            } catch (bgErr) {
                console.error("Background worker failed:", bgErr);
            }
        });
        
        processQueue();

    } catch (err) {
        console.error('Generator Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        isGenerating = false;
    }
};

export const getDraft = async (req, res) => {
    try {
        const draft = await models.DraftTimetable.findById(req.params.id);
        if (draft && draft.drafts[0] && draft.drafts[0].meta.stabilityPending) {
             if (Date.now() - draft.drafts[0].meta.lastUpdatedAt > MAX_STABILITY_WAIT) {
                 await models.DraftTimetable.updateOne(
                    { _id: draft._id },
                    { $set: { "drafts.$[].meta.stabilityPending": false } }
                 );
                 draft.drafts.forEach(d => d.meta.stabilityPending = false);
             }
        }
        res.json(draft);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const publishDraft = async (req, res) => {
    try {
        const { draftId, optionIndex } = req.params;
        const { sectionId } = req.body;
        const generation = await models.Generation.findOneAndUpdate(
            { status: 'ACTIVE' },
            { status: 'LOCKED' },
            { new: true }
        );
        if (!generation) return res.status(400).json({ error: 'No ACTIVE generation cycle found or Generation already locked.' });

        const draftDoc = await models.DraftTimetable.findById(draftId);
        if (!draftDoc) {
             await models.Generation.updateOne({ _id: generation._id }, { $set: { status: 'ACTIVE' } });
             return res.status(404).json({ error: 'Draft not found' });
        }

        try {
            const chosen = draftDoc.drafts[parseInt(optionIndex, 10)];
            if (sectionId) {
                const sectionTimetable = chosen.timetable.filter(t => t.sectionId.toString() === sectionId.toString());
                if (sectionTimetable.length > 0) {
                     await models.Timetable.deleteMany({ sectionId: sectionId, generationId: generation._id });
                     await models.Timetable.insertMany(sectionTimetable.map(t => ({
                         sectionId: t.sectionId, programId: t.programId, yearId: t.yearId, courseId: t.courseId,
                         teacherId: t.teacherId, roomId: t.roomId, generationId: generation._id,
                         day: t.day, slot: t.slot, component: t.component
                     })));
                } else {
                     await models.Generation.updateOne({ _id: generation._id }, { $set: { status: 'ACTIVE' } });
                     return res.status(400).json({ error: 'No timetable data found for this section in the draft.' });
                }
            } else {
                const sampleEntry = chosen.timetable[0];
                if (sampleEntry && sampleEntry.programId && sampleEntry.yearId) {
                     await models.Timetable.deleteMany({ programId: sampleEntry.programId, yearId: sampleEntry.yearId, generationId: generation._id });
                }

                await models.Timetable.insertMany(chosen.timetable.map(t => ({
                    sectionId: t.sectionId, programId: t.programId, yearId: t.yearId, courseId: t.courseId,
                    teacherId: t.teacherId, roomId: t.roomId, generationId: generation._id,
                    day: t.day, slot: t.slot, component: t.component
                })));

                await models.DraftTimetable.findByIdAndDelete(draftId);
            }
        } finally {
            await models.Generation.updateOne({ _id: generation._id }, { $set: { status: 'ACTIVE' } });
        }
        res.json({ message: sectionId ? 'Section timetable published successfully!' : 'Published successfully' });
    } catch (err) {
        if (err.message.includes('No ACTIVE')) res.status(400);
        res.status(500).json({ error: err.message });
    }
};

export const getActiveGeneration = async (req, res) => {
    try {
        const generation = await models.Generation.findOne({ status: 'ACTIVE' });
        if (!generation) return res.status(404).json({ error: 'No active generation found.' });
        res.json(generation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getPendingDraftSummary = async (req, res) => {
    try {
        const drafts = await models.DraftTimetable.find({}, '_id');
        if (drafts.length > 0) {
            res.json({ hasPending: true, draftId: drafts[0]._id });
        } else {
            res.json({ hasPending: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const clearPendingDrafts = async (req, res) => {
    try {
        await models.DraftTimetable.deleteMany({});
        res.json({ message: 'All pending drafts cleared.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const generateGlobalDraftsCore = async (req, res) => {
    const generation = await models.Generation.findOne({ status: 'ACTIVE' });
    if (!generation) return res.status(400).json({ error: 'No ACTIVE generation cycle found.' });
    const generationId = generation._id;

    if (isGenerating) return res.status(423).json({ error: 'Generation already in progress.' });
    
    const pendingDrafts = await models.DraftTimetable.countDocuments();
    if (pendingDrafts > 0) return res.status(400).json({ error: 'Please publish or clear pending drafts before generating new scopes.' });

    isGenerating = true;

    try {
        console.log(`Starting GLOBAL multi-pass generation`);
        
        // 1. Find all active Section scopes
        const groupedSections = await models.Section.aggregate([
            { $group: { _id: { programId: "$programId", yearId: "$yearId" }, sectionsCount: { $sum: 1 } } },
            { $sort: { sectionsCount: -1 } } // Step 3: Harder first
        ]);
        
        // Step 2: Global State Tracking
        const globalState = { 
            teacherBlockSet: new Set(), 
            roomBlockSet: new Set() 
        };
        
        let finalTimetable = [];
        let totalUnscheduled = [];
        
        const rooms = await models.Room.find();
        const courses = await models.Course.find();
        const teachers = await models.Teacher.find();

        for (const target of groupedSections) {
            const { programId, yearId } = target._id;
            const sections = await models.Section.find({ programId, yearId });
            const sectionIds = sections.map(s => s._id);
            let assignments = await models.CourseAssignment.find({ sectionId: { $in: sectionIds }});
            
            if (!sections.length || !assignments.length) continue;

            const teacherIdsSet = new Set();
            assignments.forEach(a => {
                 if (a.theoryTeacherIds) a.theoryTeacherIds.forEach(t => teacherIdsSet.add(t.toString()));
                 if (a.labTeacherIds) a.labTeacherIds.forEach(t => teacherIdsSet.add(t.toString()));
            });
            const teacherIdsArr = Array.from(teacherIdsSet);
            const targetTeachers = teachers.filter(t => teacherIdsArr.includes(t._id.toString()));

            // Step 8: Safety Check
            const totalSessions = assignments.reduce((acc, a) => {
                const course = courses.find(c => c._id.toString() === a.courseId.toString());
                if (!course) return acc;
                const tHrs = course.theorySessions?.reduce((sum, h) => sum + h, 0) || 0;
                const lHrs = course.labSessions?.reduce((sum, h) => sum + h, 0) || 0;
                return acc + tHrs + lHrs;
            }, 0);
            
            const capacity = rooms.length * DAYS_LENGTH * SLOTS_LENGTH;
            const utilization = totalSessions / capacity;
            if (utilization > 0.85) console.warn("High Resource Utilization Warning: Check solver load");
            
            // Step 5: Assign Teachers with balancing - ensuring pool is ordered properly by availability
            const availabilityScore = (tid) => {
                let blocked = 0;
                globalState.teacherBlockSet.forEach(b => { if (b.startsWith(tid)) blocked++; });
                const teacher = targetTeachers.find(t => t._id.toString() === tid);
                if (teacher && teacher.unavailableSlots) blocked += teacher.unavailableSlots.length;
                return blocked;
            };

            assignments.forEach(a => {
                if (a.theoryTeacherIds) a.theoryTeacherIds.sort((t1, t2) => availabilityScore(t1.toString()) - availabilityScore(t2.toString()));
                if (a.labTeacherIds) a.labTeacherIds.sort((t1, t2) => availabilityScore(t1.toString()) - availabilityScore(t2.toString()));
            });
            
            assignments = faker.helpers.shuffle(assignments);

            // Step 4: Light Room Partitioning (we pass full set, Prolog native tracking handles boundaries dynamically)
            const facts = generateSystemFacts(targetTeachers, rooms, sections, courses, assignments, globalState.teacherBlockSet, globalState.roomBlockSet);

            const engineResponse = await executePrologSolver(facts);
            
            if (engineResponse && engineResponse.drafts && engineResponse.drafts.length > 0) {
                const draft = engineResponse.drafts[0];
                
                let localUnscheduledCount = 0;
                
                // Map the output
                draft.timetable.forEach(entry => {
                    const parts = entry.courseId.split('_');
                    const cid = parts[1];
                    const componentCode = parts[2];
                    
                    const course = courses.find(c => c._id.toString() === cid);
                    const teacher = targetTeachers.find(t => t._id.toString() === (entry.teacherId === 'none' ? '' : entry.teacherId.replace('id_', '')));
                    const section = sections.find(s => s._id.toString() === entry.sectionId.replace('id_', ''));
                    const room    = rooms.find(r => r._id.toString() === (entry.roomId === 'none' ? '' : entry.roomId.replace('id_', '')));

                    const mappedEntry = {
                        sectionId: entry.sectionId.replace('id_', ''), sectionName: section?.name || 'Unknown',
                        programId, yearId,
                        courseId: cid, courseName: course?.name || 'Unknown',
                        teacherId: entry.teacherId === 'none' ? null : entry.teacherId.replace('id_', ''), teacherName: entry.teacherId === 'none' ? 'None' : (teacher?.name || 'Unknown'),
                        roomId: entry.roomId === 'none' ? null : entry.roomId.replace('id_', ''), roomName: entry.roomId === 'none' ? 'None' : (room?.name || 'Unknown'),
                        day: entry.day, slot: entry.slot, component: componentCode === 'T' ? 'theory' : 'lab',
                        status: entry.status ?? 1
                    };

                    if (mappedEntry.status === 1) {
                        finalTimetable.push(mappedEntry);
                        // Step 7: Update global state tracking for overlaps efficiently
                        if (mappedEntry.teacherId) globalState.teacherBlockSet.add(`${mappedEntry.teacherId}-${mappedEntry.day}-${mappedEntry.slot}`);
                        if (mappedEntry.roomId) globalState.roomBlockSet.add(`${mappedEntry.roomId}-${mappedEntry.day}-${mappedEntry.slot}`);
                    } else {
                        localUnscheduledCount++;
                        totalUnscheduled.push(mappedEntry);
                    }
                });
                
                if (localUnscheduledCount > 0) {
                    console.warn(`Partial schedule for ${programId}-${yearId}`);
                }
            } else {
                throw new Error(`Solver failed to produce a valid run for subset Program: ${programId}, Year: ${yearId}`);
            }
        }
        
        // Final Draft Compilation merged properly
        const cleanDrafts = [{
            status: totalUnscheduled.length > 0 ? 'partial' : 'success',
            solverState: totalUnscheduled.length > 0 ? 'partial' : 'optimal',
            scheduled: finalTimetable,
            unscheduled: totalUnscheduled,
            summary: { 
                total: finalTimetable.length + totalUnscheduled.length, 
                scheduled: finalTimetable.length, 
                unscheduled: totalUnscheduled.length, 
                qualityScore: (finalTimetable.length) / (finalTimetable.length + totalUnscheduled.length || 1), 
                confidence: 1, trustScore: 1 
            },
            analytics: { failureSummary: {}, bottleneckContext: { affectedSections: [], topAffectedCourses: [] } },
            systemHealth: { status: totalUnscheduled.length > 0 ? 'strained' : 'healthy', reason: 'Global pass completed' },
            meta: { runId: crypto.randomUUID(), generationId, stabilityPending: false, solverTimeMs: 0 },
            timetable: finalTimetable
        }];

        const draftDoc = await models.DraftTimetable.create({ drafts: cleanDrafts, createdBy: req.user?._id });
        res.json({ draftId: draftDoc._id });

    } catch (err) {
        console.error('Global Generator Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        isGenerating = false;
    }
};
