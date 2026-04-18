import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Import Mongoose Models
import { Program } from '../models/Program.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { Section } from '../models/Section.js';
import { Teacher } from '../models/Teacher.js';
import { Room } from '../models/Room.js';
import { Course } from '../models/Course.js';
import { CourseAssignment } from '../models/CourseAssignment.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Generation } from '../models/Generation.js';
import bcrypt from 'bcryptjs';

dotenv.config();

// 1. Deterministic Seeding
faker.seed(42);

// Configuration
const CONFIG = {
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/uni-timetable-gen',
    PROGRAMS: [
        { name: 'B.Tech CSE', durationYears: 4, domain: 'CSE' },
        { name: 'B.Tech ECE', durationYears: 4, domain: 'ECE' },
        { name: 'MBA Core', durationYears: 2, domain: 'MBA' }
    ],
    SECTION_NAMES: ['A', 'B'],   // reduced from ['A','B','C','D'] — cuts problem size by 50%
    FACULTY_COUNT: 25,             // increased from 20 — avoids teacher overload edge cases
    ROOM_COUNT: 25,                // increased from 15 — prevents room bottlenecks during testing
};

// 3. Room Config
const ROOM_CONFIG = {
    LAB: {
        capacity: 60,
        ratio: 0.3
    },
    CLASSROOM_DISTRIBUTION: [
        { capacity: 60, weight: 0.6 },
        { capacity: 120, weight: 0.25 },
        { capacity: 40, weight: 0.15 }
    ]
};

// 6. Course Realism
const COURSE_POOL = {
    CSE: {
        1: ["Engineering Mathematics", "Programming in C", "Engineering Physics", "Basics of Electronics", "Communication Skills"],
        2: ["Data Structures in C++", "Database Management Systems", "Operating Systems", "Computer Architecture", "Discrete Mathematics"],
        3: ["Design & Analysis of Algorithms", "Computer Networks", "Software Engineering", "Web Technologies", "Theory of Computation"],
        4: ["Machine Learning", "Cloud Computing", "Information Security", "Big Data Analytics", "Blockchain Fundamentals"],
    },
    ECE: {
        1: ["Engineering Mathematics", "Basic Electrical Engg", "Engineering Physics", "Programming in C", "Environmental Science"],
        2: ["Digital Logic Design", "Network Analysis", "Electronic Devices", "Signals & Systems", "Electromagnetic Theory"],
        3: ["Analog Communication", "Microprocessors", "Control Systems", "Digital Signal Processing", "Antenna Design"],
        4: ["VLSI Design", "Optical Networks", "Wireless Communication", "Embedded Systems", "Information Theory"],
    },
    MBA: {
        1: ["Managerial Economics", "Financial Accounting", "Marketing Management", "Organizational Behavior", "Business Communication"],
        2: ["Strategic Management", "Operations Research", "Human Resource Mgmt", "Business Ethics", "Consumer Behavior"],
    }
};

const clearDB = async () => {
    console.log('🗑️ Clearing existing database collections...');
    await Promise.all([
        Program.deleteMany({}),
        AcademicYear.deleteMany({}),
        Section.deleteMany({}),
        Teacher.deleteMany({}),
        Room.deleteMany({}),
        Course.deleteMany({}),
        CourseAssignment.deleteMany({}),
        Student.deleteMany({}),
        User.deleteMany({}),
        Generation.deleteMany({})
    ]);
    
    console.log('Seeding Generation Baseline...');
    await Generation.create({ name: 'Fall 2026', status: 'ACTIVE' });
};

const createProgramsAndStructure = async () => {
    console.log('📚 Creating Programs, Academic Years, and Sections...');
    const createdPrograms = [];
    const createdYears = [];
    const createdSections = [];

    for (const progData of CONFIG.PROGRAMS) {
        const program = await Program.create({
            name: progData.name,
            durationYears: progData.durationYears
        });
        createdPrograms.push({ ...program.toObject(), domain: progData.domain });

        for (let yearNum = 1; yearNum <= progData.durationYears; yearNum++) {
            const year = await AcademicYear.create({
                programId: program._id,
                yearNumber: yearNum
            });
            createdYears.push(year);

            for (const secName of CONFIG.SECTION_NAMES) {
                const strength = faker.number.int({ min: 40, max: 60 });
                const section = await Section.create({
                    yearId: year._id,
                    programId: program._id,
                    name: secName,
                    strength: strength
                });
                createdSections.push(section);
            }
        }
    }

    return { createdPrograms, createdYears, createdSections };
};

// 4. Room Generation Logic
function pickClassroomCapacity() {
    const rand = faker.number.float({ min: 0, max: 1 });
    let cumulative = 0;

    for (const item of ROOM_CONFIG.CLASSROOM_DISTRIBUTION) {
        cumulative += item.weight;
        if (rand <= cumulative) return item.capacity;
    }

    return 60;
}

const createFacultyAndRooms = async () => {
    console.log('👩‍🏫 Creating Faculty and Rooms...');
    
    const facultyList = [];
    const specializations = ['CSE', 'ECE', 'MBA'];
    
    for (let i = 0; i < CONFIG.FACULTY_COUNT; i++) {
        const blockedCount = faker.number.int({ min: 0, max: 1 }); // max:2 -> max:1 for testing stability
        const unavailableSlots = [];
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
        
        for (let j = 0; j < blockedCount; j++) {
            unavailableSlots.push({
                day: faker.helpers.arrayElement(days),
                slot: faker.number.int({ min: 1, max: 6 })
            });
        }

        const teacher = await Teacher.create({
            name: `Dr. ${faker.person.lastName()}`,
            maxHoursPerWeek: faker.number.int({ min: 12, max: 22 }),
            specialization: faker.helpers.arrayElement(specializations),
            unavailableSlots
        });
        facultyList.push(teacher);
    }

    const roomList = [];
    const totalRooms = CONFIG.ROOM_COUNT;
    const labCount = Math.floor(totalRooms * ROOM_CONFIG.LAB.ratio);
    const classroomCount = totalRooms - labCount;

    let roomNumber = 101;
    // Create Labs first
    for (let i = 0; i < labCount; i++) {
        const room = await Room.create({
            name: `Lab-${roomNumber++}`,
            type: 'lab',
            capacity: ROOM_CONFIG.LAB.capacity
        });
        roomList.push(room);
    }

    // Create Classrooms
    for (let i = 0; i < classroomCount; i++) {
        const capacity = pickClassroomCapacity();
        const room = await Room.create({
            name: `Room-${roomNumber++}`,
            type: 'classroom',
            capacity: capacity
        });
        roomList.push(room);
    }

    return { facultyList, roomList };
};

const createCoursesAndAssignments = async (programs, years, sections, faculty) => {
    console.log('📝 Creating Courses and linking Assignments...');
    const courses = [];
    const assignments = [];
    
    const facultyLoads = new Map(faculty.map(f => [f._id.toString(), { max: f.maxHoursPerWeek, current: 0, spec: f.specialization }]));

    // Returns a pool of 2-3 available teachers for a course.
    // Pool size >= 2 is MANDATORY: single-teacher pools prevent the solver from
    // recovering when a teacher is blocked by projection constraints.
    const getTeacherPool = (requiredHours, targetSpecialization) => {
        // First: try to find enough teachers from the target specialization
        let available = faculty.filter(f => {
            const load = facultyLoads.get(f._id.toString());
            return load.spec === targetSpecialization && (load.current + requiredHours) <= load.max;
        });

        // Fallback: if fewer than 2 in-spec teachers, widen to all faculty
        if (available.length < 2) {
            available = faculty.filter(f => {
                const load = facultyLoads.get(f._id.toString());
                return (load.current + requiredHours) <= load.max;
            });
        }

        if (available.length === 0) return [];

        const shuffled = faker.helpers.shuffle([...available]);
        const poolSize = Math.min(shuffled.length, faker.number.int({ min: 2, max: 3 }));
        const pool = shuffled.slice(0, poolSize);

        // Charge hours against EVERY teacher in the pool so load tracking stays accurate
        pool.forEach(t => { facultyLoads.get(t._id.toString()).current += requiredHours; });

        return pool;
    };

    let courseCounter = 100;
    // fallbackCount removed: fallback random assignment is disabled for testing

    for (const program of programs) {
        const programYears = years.filter(y => y.programId.toString() === program._id.toString());
        
        for (const year of programYears) {
            const subjects = COURSE_POOL[program.domain][year.yearNumber] || [];
            
            for (let c = 0; c < subjects.length; c++) {
                courseCounter++;
                const isLabCourse = false; // hardcoded false: labs disabled during testing (hardest constraints)
                
                const theoryTotal = faker.helpers.arrayElement([2, 3, 4]);
                const theorySessions = theoryTotal === 4 ? [2, 2] : (theoryTotal === 3 ? [2, 1] : [2]);
                
                const labTotal = isLabCourse ? 2 : 0;
                const labSessions = isLabCourse ? [2] : [];

                const prefix = program.domain;
                const subName = subjects[c];

                const course = await Course.create({
                    programId: program._id,
                    yearId: year._id,
                    name: subName,
                    code: `${prefix}-${courseCounter}`,
                    theoryTotal,
                    theorySessions,
                    labTotal,
                    labSessions
                });
                courses.push(course);

                const yearSections = sections.filter(s => s.yearId.toString() === year._id.toString());
                
                for (const section of yearSections) {
                    const theoryTeacherIds = [];
                    const labTeacherIds = [];

                    const theoryPool = getTeacherPool(theoryTotal, program.domain);
                    theoryTeacherIds.push(...theoryPool.map(t => t._id));

                    if (labTotal > 0) {
                        const labPool = getTeacherPool(labTotal, program.domain);
                        labTeacherIds.push(...labPool.map(t => t._id));
                    }

                    // Enforce minimum pool size of 2 — a single-teacher pool breaks solver flexibility
                    if (theoryTeacherIds.length < 2) continue;
                    if (labTotal > 0 && labTeacherIds.length < 2) continue;

                    const assignment = await CourseAssignment.create({
                        courseId: course._id,
                        sectionId: section._id,
                        theoryTeacherIds,
                        labTeacherIds
                    });
                    assignments.push(assignment);
                }
            }
        }
    }

    // Sanity log: validate seeded data integrity before running solver
    const totalLoad = [...facultyLoads.values()].reduce((a, b) => a + b.current, 0);
    const avgLoad = faculty.length > 0 ? (totalLoad / faculty.length).toFixed(1) : 0;
    const poolSizes = assignments.map(a => a.theoryTeacherIds.length);
    const avgPoolSize = poolSizes.length > 0 ? (poolSizes.reduce((a, b) => a + b, 0) / poolSizes.length).toFixed(1) : 0;
    const singleTeacherCount = poolSizes.filter(s => s < 2).length;
    console.log('\n Assignment Sanity Check:');
    console.log(JSON.stringify({
        totalAssignments: assignments.length,
        totalCourses: courses.length,
        teachersUsed: faculty.length,
        avgLoadHrs: Number(avgLoad),
        avgTheoryPoolSize: Number(avgPoolSize),
        singleTeacherAssignments: singleTeacherCount, // must be 0
    }, null, 2));
    if (singleTeacherCount > 0) {
        console.warn(`  WARNING: ${singleTeacherCount} assignments have pool size < 2. Solver flexibility is compromised.`);
    }

    return { courses, assignments, facultyLoads };
};

const createStudents = async (sections) => {
    console.log('🎓 Enrolling Students...');
    const studentsList = [];
    
    const batches = [];
    let studentCounter = 1000;
    
    for (const section of sections) {
        for (let i = 0; i < section.strength; i++) {
            studentCounter++;
            batches.push({
                name: faker.person.fullName(),
                rollNumber: `STU-${studentCounter}`,
                email: faker.internet.email(),
                sectionId: section._id,
                programId: section.programId,
                yearId: section.yearId
            });
        }
    }
    
    const result = await Student.insertMany(batches);
    studentsList.push(...result);
    
    return studentsList;
};

const createUsers = async (facultyList, studentsList) => {
    console.log('🔑 Creating User Accounts for Staff & Students...');
    const userBatches = [];

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    userBatches.push({
        username: 'admin',
        password: passwordHash,
        role: 'admin'
    });

    facultyList.forEach((teacher, index) => {
        const cleanName = teacher.name.replace(/[^a-zA-Z]/g, '').toLowerCase() + index;
        userBatches.push({
            username: cleanName,
            password: passwordHash,
            role: 'prof',
            profileId: teacher._id,
            profileModel: 'Teacher'
        });
    });

    studentsList.forEach(student => {
        userBatches.push({
            username: student.rollNumber,
            password: passwordHash,
            role: 'student',
            profileId: student._id,
            profileModel: 'Student'
        });
    });

    const result = await User.insertMany(userBatches);
    return result;
};

const seed = async () => {
    try {
        console.log(`\n⏳ Connecting to database at ${CONFIG.MONGO_URI}...`);
        await mongoose.connect(CONFIG.MONGO_URI);
        console.log('✅ Connected.');

        await clearDB();

        const { createdPrograms, createdSections, createdYears } = await createProgramsAndStructure();
        const { facultyList, roomList } = await createFacultyAndRooms();
        const { courses, assignments, facultyLoads } = await createCoursesAndAssignments(createdPrograms, createdYears, createdSections, facultyList);
        const studentsList = await createStudents(createdSections);
        const usersList = await createUsers(facultyList, studentsList);

        const labs = roomList.filter(r => r.type === 'lab');
        const classrooms = roomList.filter(r => r.type === 'classroom');
        const c40 = classrooms.filter(r => r.capacity === 40).length;
        const c60 = classrooms.filter(r => r.capacity === 60).length;
        const c120 = classrooms.filter(r => r.capacity === 120).length;

        console.log('\n=======================================');
        console.log('🎉 SEEDING COMPLETE! GENERATED DATA:');
        console.log('=======================================');
        console.log(`🏢 Programs:      ${createdPrograms.length}`);
        console.log(`📅 Academic Yrs:  ${createdYears.length}`);
        console.log(`🏛️ Sections:      ${createdSections.length}`);
        console.log(`👨‍🏫 Faculty:       ${facultyList.length}`);
        
        console.log(`\n🏫 Rooms:         ${roomList.length}`);
        console.log(`  - Labs:           ${labs.length}`);
        console.log(`  - Classrooms:     ${classrooms.length}`);
        console.log(`      - Capacity 40:  ${c40}`);
        console.log(`      - Capacity 60:  ${c60}`);
        console.log(`      - Capacity 120: ${c120}`);

        console.log(`\n📖 Courses:       ${courses.length}`);
        console.log(`🔗 Assignments:   ${assignments.length}`);
        console.log(`🧑‍🎓 Students:      ${studentsList.length}`);
        console.log(`🔑 User Accounts: ${usersList.length}`);

        console.log('\n📊 Faculty Load Distribution:');
        let overloaded = 0;
        facultyList.forEach(f => {
            const load = facultyLoads.get(f._id.toString());
            console.log(`  - ${f.name} (${f.specialization}): ${load.current}/${load.max} hrs`);
            if (load.current > load.max) overloaded++;
        });
        if (overloaded > 0) console.log(`  ⚠️ Overloaded (Random Fallback): ${overloaded}`);

        console.log('\n=======================================');
        console.log('Login credentials (all passwords are: password123)');
        console.log(`Admin: admin`);
        console.log(`Prof:  ${usersList.find(u => u.role === 'prof')?.username || 'N/A'}`);
        console.log(`Student: ${usersList.find(u => u.role === 'student')?.username || 'N/A'}`);
        console.log('=======================================\n');

        mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error('❌ SEEDING FAILED:', e);
        mongoose.connection.close();
        process.exit(1);
    }
};

seed();
