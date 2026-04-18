import * as models from '../models/index.js';
import { executePrologSolver } from '../services/prologService.js';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

let isGenerating = false;

const DAYS_LENGTH = 5;
const SLOTS_LENGTH = 8;
const maxRoomSlots = DAYS_LENGTH * SLOTS_LENGTH;

const generateSystemFacts = (teachers, rooms, sections, courses, assignments) => {
    let facts = '';
    teachers.forEach(t => facts += `teacher(id_${t._id}, ${t.maxHoursPerWeek}).\n`);
    rooms.forEach(r => facts += `room(id_${r._id}, ${r.type}, ${r.capacity}).\n`);
    sections.forEach(s => facts += `section(id_${s._id}, ${s.strength}).\n`);
    
    courses.forEach(c => {
        if (c.theorySessions?.length) {
            c.theorySessions.forEach((duration, i) => {
                facts += `course(id_${c._id}_T_${i}, theory, ${duration}, ${duration}).\n`;
            });
        }
        if (c.labSessions?.length) {
            c.labSessions.forEach((duration, i) => {
                facts += `course(id_${c._id}_L_${i}, lab, ${duration}, ${duration}).\n`;
            });
        }
    });

    assignments.forEach(a => {
        const course = courses.find(c => c._id.toString() === a.courseId.toString());
        if (!course) return;

        if (course.theorySessions?.length && a.theoryTeacherIds?.length) {
            course.theorySessions.forEach((_, i) => {
                const subId = `id_${course._id}_T_${i}`;
                facts += `section_course(id_${a.sectionId}, ${subId}).\n`;
                facts += `allowed_teachers(${subId}, id_${a.sectionId}, [${a.theoryTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
            });
        }

        if (course.labSessions?.length && a.labTeacherIds?.length) {
            course.labSessions.forEach((_, i) => {
                const subId = `id_${course._id}_L_${i}`;
                facts += `section_course(id_${a.sectionId}, ${subId}).\n`;
                facts += `allowed_teachers(${subId}, id_${a.sectionId}, [${a.labTeacherIds.map(id => `id_${id}`).join(', ')}]).\n`;
            });
        }
    });

    teachers.forEach(t => t.unavailableSlots?.forEach(s => facts += `unavailable(id_${t._id}, ${s.day}, ${s.slot}).\n`));
    
    facts += '\n% The Grid\n';
    facts += 'day(mon). day(tue). day(wed). day(thu). day(fri).\n';
    facts += 'slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).\n';
    return facts;
};

export const generateDrafts = async (req, res) => {
    if (isGenerating) {
        return res.status(423).json({ error: 'Generation already in progress.' });
    }

    isGenerating = true;

    // Metrics for failure logging
    let totalSessions = 0;
    let totalSlots = 0;
    let teacherCapacity = 0;

    try {
        console.log('Starting draft generation with DSS Background Polling...');

        const teachers    = await models.Teacher.find();
        const rooms       = await models.Room.find();
        const sections    = await models.Section.find();
        const courses     = await models.Course.find();
        let assignments = await models.CourseAssignment.find();

        if (!teachers.length || !rooms.length || !sections.length || !courses.length) {
            return res.status(400).json({ error: 'Insufficient data for generation.' });
        }

        for (const assignment of assignments) {
            if (!assignment.theoryTeacherIds || assignment.theoryTeacherIds.length === 0) {
                throw new Error(`No teachers assigned for course ${assignment.courseId}`);
            }
            if (assignment.theoryTeacherIds.length < 2) {
                console.warn(`⚠️ Course ${assignment.courseId} has only 1 teacher`);
            }
        }

        totalSlots = rooms.length * maxRoomSlots;
        totalSessions = assignments.reduce((acc, a) => {
            const course = courses.find(c => c._id.toString() === a.courseId.toString());
            if (!course) return acc;
            return acc + (course.theorySessions?.length || 0) + (course.labSessions?.length || 0);
        }, 0);

        if (totalSessions > totalSlots) {
            throw new Error("INSUFFICIENT ROOM CAPACITY");
        }

        teacherCapacity = teachers.reduce((acc, t) => acc + (t.maxHoursPerWeek || 0), 0);
        if (totalSessions > teacherCapacity) {
            console.warn("⚠️ Not enough teacher capacity");
        }

        assignments = faker.helpers.shuffle(assignments);
        assignments.sort((a, b) => {
            const aPool = (a.theoryTeacherIds?.length || 0) + (a.labTeacherIds?.length || 0);
            const bPool = (b.theoryTeacherIds?.length || 0) + (b.labTeacherIds?.length || 0);
            return aPool - bPool;
        });

        const facts = generateSystemFacts(teachers, rooms, sections, courses, assignments);

        console.log('Executing primary solver...');
        const engineResponse = await executePrologSolver(facts);

        if (!engineResponse || !engineResponse.drafts) {
            throw new Error('Solver failed to return valid JSON.');
        }

        const solverStartTime = Date.now();
        const cleanDrafts = engineResponse.drafts.map(draft => {
            const scheduled = [];
            const unscheduled = [];
            const failureSet = new Set();
            const failureSummary = {
                roomContentions: 0,
                teacherContentions: 0,
                constraintDeadlocks: 0,
                noRooms: 0,
                noTeachers: 0
            };

            let totalWeight = 0;
            let scheduledWeight = 0;
            let unscheduledWeight = 0;
            
            let tp = 0; // True Positive (High Risk -> Failed)
            let fp = 0; // False Positive (High Risk -> Succeeded)
            let fn = 0; // False Negative (Low Risk -> Failed)

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

                const assignment = assignments.find(a => 
                    a.sectionId.toString() === entry.sectionId.replace('id_', '') && 
                    a.courseId.toString() === cid
                );
                const teacherPool = componentCode === 'T' ? (assignment?.theoryTeacherIds || []) : (assignment?.labTeacherIds || []);
                const roomOptions = rooms.filter(r => 
                    r.capacity >= (section?.strength || 0) && 
                    (componentCode === 'T' ? r.type === 'classroom' : r.type === 'lab')
                );
                
                const risk = (teacherPool.length === 1 || roomOptions.length <= 1) ? "high" : undefined;
                const sectionSize = section?.strength || 0;

                const mappedEntry = {
                    sectionId: entry.sectionId.replace('id_', ''),
                    sectionName: section?.name || 'Unknown',
                    courseId: cid,
                    courseName: course?.name || 'Unknown',
                    teacherId: entry.teacherId === 'none' ? null : entry.teacherId.replace('id_', ''),
                    teacherName: entry.teacherId === 'none' ? 'None' : (teacher?.name || 'Unknown'),
                    roomId: entry.roomId === 'none' ? null : entry.roomId.replace('id_', ''),
                    roomName: entry.roomId === 'none' ? 'None' : (room?.name || 'Unknown'),
                    day: entry.day,
                    slot: entry.slot,
                    component: componentCode === 'T' ? 'theory' : 'lab',
                    status: entry.status ?? 1,
                    risk
                };

                if (mappedEntry.status === 1) {
                    scheduled.push(mappedEntry);
                    scheduledWeight += weight;
                    if (risk === "high") fp++; 
                } else {
                    unscheduledWeight += weight;
                    if (risk === "high") { mappedEntry.riskConfirmed = true; tp++; }
                    else { fn++; }

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
            const solverReliability = solverReliabilityMap[solverState] || 0.5;
            
            const confidence = qualityScore * solverReliability;
            const trustScore = (qualityScore * 0.4) + (confidence * 0.3); // Stability initially 0 until async finish

            const hashSource = [...scheduled].sort((a, b) => {
                return (a.sectionId || "").localeCompare(b.sectionId || "") ||
                       (a.day || "").localeCompare(b.day || "") ||
                       (a.slot || 0) - (b.slot || 0);
            }).map(s => `${s.courseId}-${s.teacherId}-${s.roomId}-${s.day}-${s.slot}`).join('|');
            const solutionHash = crypto.createHash('md5').update(hashSource).digest('hex');

            let maxFailures = 0;
            let topBottleneck = "None";
            Object.entries(failureSummary).forEach(([key, count]) => {
                if (count > maxFailures) {
                    maxFailures = count;
                    topBottleneck = key;
                }
            });
            const bottleneckImpact = unscheduledCount > 0 ? parseFloat((maxFailures / unscheduledCount).toFixed(2)) : 0;

            const affectedCourseTracker = {};
            const affectedSectionSet = new Set();
            unscheduled.forEach(u => {
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
            const topAffectedCourses = Object.entries(affectedCourseTracker)
                .map(([name, count]) => ({ courseId: name, failureCount: count }))
                .sort((a,b) => b.failureCount - a.failureCount);

            const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
            const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;

            let sysStatus = "critical";
            if (qualityScore > 0.9 && failureRate < 0.1) sysStatus = "healthy";
            else if (qualityScore > 0.7) sysStatus = "strained";
            
            const systemHealth = {
                status: sysStatus,
                reason: maxFailures > 0 ? `${topBottleneck} (${(bottleneckImpact * 100).toFixed(0)}%)` : 'Nominal execution'
            };

            return {
                status: unscheduledCount > 0 ? (solverState === 'infeasible' ? 'infeasible' : 'partial') : 'success',
                solverState: solverState,
                scheduled,
                unscheduled,
                summary: {
                    total, scheduled: scheduledCount, unscheduled: unscheduledCount,
                    qualityScore, weightedScore, penaltyScore, confidence, trustScore
                },
                analytics: {
                    failureSummary, topBottleneck, bottleneckImpact,
                    bottleneckContext: { affectedSections: Array.from(affectedSectionSet), topAffectedCourses },
                    stabilityScore: 0,
                    riskStats: { truePositive: tp, falsePositive: fp, falseNegative: fn, precision, recall }
                },
                systemHealth,
                meta: { solutionHash, solverTime: Date.now() - solverStartTime, stabilityPending: true },
                timetable: scheduled 
            };
        });

        const draftDoc = await models.DraftTimetable.create({ drafts: cleanDrafts, createdBy: req.user._id });
        res.json({ draftId: draftDoc._id }); // RETURN INSTANTLY
        
        // --- ASYNC BACKGROUND WORKER (STABILITY POLLING) ---
        (async () => {
            try {
                console.log("Launching background stability polling...");
                const ogDraft = cleanDrafts[0];
                const ogHashArr = ogDraft.scheduled.map(s => `${s.courseId}-${s.teacherId}-${s.roomId}-${s.day}-${s.slot}`);
                let simScores = [];
                
                for (let i = 0; i < 2; i++) {
                    const shuffledAssigns = faker.helpers.shuffle([...assignments]).sort((a, b) => {
                        return ((a.theoryTeacherIds?.length || 0) + (a.labTeacherIds?.length || 0)) - 
                               ((b.theoryTeacherIds?.length || 0) + (b.labTeacherIds?.length || 0));
                    });
                    
                    const newFacts = generateSystemFacts(teachers, rooms, sections, courses, shuffledAssigns);
                    const runResp = await executePrologSolver(newFacts);
                    
                    if (runResp && runResp.drafts && runResp.drafts.length > 0) {
                        const newSched = runResp.drafts[0].timetable.filter(t => (t.status ?? 1) === 1);
                        const newHashArr = newSched.map(s => {
                            const cidParts = s.courseId.split('_');
                            const tId = s.teacherId === 'none' ? 'null' : s.teacherId.replace('id_', '');
                            const rId = s.roomId === 'none' ? 'null' : s.roomId.replace('id_', '');
                            return `${cidParts[1]}-${tId}-${rId}-${s.day}-${s.slot}`;
                        });
                        
                        let overlap = 0;
                        newHashArr.forEach(h => { if (ogHashArr.includes(h)) overlap++; });
                        simScores.push(ogHashArr.length > 0 ? (overlap / ogHashArr.length) : 1);
                    } else {
                        simScores.push(0);
                    }
                }

                const avgStability = simScores.reduce((a,b) => a+b, 0) / simScores.length;
                let draftToUpdate = await models.DraftTimetable.findById(draftDoc._id);
                
                if (draftToUpdate) {
                    draftToUpdate.drafts.forEach(d => {
                        d.analytics.stabilityScore = avgStability;
                        d.summary.trustScore = (d.summary.qualityScore * 0.4) + (d.summary.confidence * 0.3) + (avgStability * 0.3);
                        d.meta.stabilityPending = false;
                    });
                    await draftToUpdate.save();
                    console.log(`Stability polling complete. Score: ${avgStability}`);
                }
            } catch (bgErr) {
                console.error("Background worker failed:", bgErr);
                let draftToUpdate = await models.DraftTimetable.findById(draftDoc._id);
                if (draftToUpdate) {
                    draftToUpdate.drafts.forEach(d => d.meta.stabilityPending = false);
                    await draftToUpdate.save();
                }
            }
        })();

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
        res.json(draft);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const publishDraft = async (req, res) => {
    try {
        const { draftId, optionIndex } = req.params;
        const draftDoc = await models.DraftTimetable.findById(draftId);
        if (!draftDoc) return res.status(404).json({ error: 'Draft not found' });
        
        const chosen = draftDoc.drafts[parseInt(optionIndex, 10)];
        await models.Timetable.deleteMany({});
        await models.Timetable.insertMany(chosen.timetable.map(t => ({
            sectionId: t.sectionId,
            courseId: t.courseId,
            teacherId: t.teacherId,
            roomId: t.roomId,
            day: t.day,
            slot: t.slot,
            component: t.component
        })));

        await models.DraftTimetable.findByIdAndDelete(draftId);
        res.json({ message: 'Published successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
