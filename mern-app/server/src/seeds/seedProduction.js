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

import { DraftTimetable } from '../models/DraftTimetable.js';
import { Timetable } from '../models/Timetable.js';

dotenv.config();

// Deterministic Seeding
faker.seed(1337);

const CONFIG = {
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/uni-timetable-gen',
    PROGRAMS: [
        { name: 'B.Tech CSE', durationYears: 4, domain: 'CSE' },
        { name: 'B.Tech ECE', durationYears: 4, domain: 'ECE' },
        { name: 'MBA Core', durationYears: 2, domain: 'MBA' }
    ],
    SECTIONS_PER_YEAR: 2,
    COURSES_PER_YEAR: 6,
    BASE_SESSIONS_PER_COURSE: 7, // Hours
    LAB_PROBABILITY: 0.55,       // Hits target utilization more reliably
    TEACHER_COUNT: 35,
    ROOM_COUNT: 25,
    LAB_ROOM_RATIO: 0.28         // 7 labs / 25 total
};

const clearDB = async () => {
    console.log('🗑️ Clearing database...');
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
        Generation.deleteMany({}),
        DraftTimetable.deleteMany({}),
        Timetable.deleteMany({})
    ]);
    await Generation.create({ name: 'Production Cycle 2026', status: 'ACTIVE' });
};

const seed = async () => {
    try {
        await mongoose.connect(CONFIG.MONGO_URI);
        await clearDB();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        // 1. Create Rooms
        const rooms = [];
        const labCount = Math.round(CONFIG.ROOM_COUNT * CONFIG.LAB_ROOM_RATIO);
        for (let i = 0; i < labCount; i++) {
            rooms.push(await Room.create({ name: `LAB-${i + 1}`, type: 'lab', capacity: 60 }));
        }
        for (let i = 0; i < (CONFIG.ROOM_COUNT - labCount); i++) {
            rooms.push(await Room.create({ name: `RM-${100 + i}`, type: 'classroom', capacity: 80 }));
        }

        // 2. Create Teachers & Users
        const teachers = [];
        const teacherUsers = [];
        for (let i = 0; i < CONFIG.TEACHER_COUNT; i++) {
            const spec = faker.helpers.arrayElement(CONFIG.PROGRAMS.map(p => p.domain));
            const teacher = await Teacher.create({
                name: `Dr. ${faker.person.lastName()}`,
                specialization: spec,
                maxHoursPerWeek: 40,
                unavailableSlots: []
            });
            teachers.push(teacher);

            // Create User account for Teacher
            const username = teacher.name.toLowerCase().replace(/[^a-z]/g, '') + (i + 1);
            teacherUsers.push({
                username,
                password: passwordHash,
                role: 'prof',
                profileId: teacher._id,
                profileModel: 'Teacher'
            });
        }
        await User.insertMany(teacherUsers);

        // 3. Create Programs, Years, Sections, Students, Users
        let totalSectionsCount = 0;
        let totalSessionsCount = 0;
        let totalStudentsCount = 0;
        const programStats = [];

        for (const progData of CONFIG.PROGRAMS) {
            const program = await Program.create({ name: progData.name, durationYears: progData.durationYears });
            let progAssignments = 0;

            for (let yr = 1; yr <= progData.durationYears; yr++) {
                const year = await AcademicYear.create({ programId: program._id, yearNumber: yr });

                // Create Courses for this year
                const yearCourses = [];
                const subjects = COURSE_POOL[progData.domain][yr] || [];

                for (let c = 0; c < CONFIG.COURSES_PER_YEAR; c++) {
                    const subName = subjects[c] || `${progData.domain} Elective ${yr}0${c + 1}`;
                    const isLabCourse = LAB_COURSES.includes(subName) || Math.random() < CONFIG.LAB_PROBABILITY;

                    const course = await Course.create({
                        programId: program._id,
                        yearId: year._id,
                        yearNumber: yr,
                        name: `${progData.domain} Core ${yr}0${c}`,
                        code: `${progData.domain}-${yr}0${c}`,
                        theoryTotal: 7,
                        theorySessions: [1, 1, 1, 1, 1, 1, 1],
                        labTotal: isLabCourse ? 2 : 0,
                        labSessions: isLabCourse ? [2] : []
                    });
                    yearCourses.push(course);
                }

                // Create Sections for this year
                for (let s = 1; s <= CONFIG.SECTIONS_PER_YEAR; s++) {
                    const strength = faker.number.int({ min: 40, max: 60 });
                    const section = await Section.create({
                        programId: program._id,
                        yearId: year._id,
                        name: String.fromCharCode(64 + s),
                        strength: strength
                    });
                    totalSectionsCount++;

                    // Create Students & Users for this section
                    const students = [];
                    const studentUsers = [];
                    for (let st = 0; st < strength; st++) {
                        const rollNumber = `${progData.domain}${yr}${s}${1000 + st}`;
                        const student = await Student.create({
                            name: faker.person.fullName(),
                            rollNumber,
                            email: faker.internet.email(),
                            sectionId: section._id,
                            programId: program._id,
                            yearId: year._id
                        });
                        students.push(student);
                        totalStudentsCount++;

                        studentUsers.push({
                            username: rollNumber,
                            password: passwordHash,
                            role: 'student',
                            profileId: student._id,
                            profileModel: 'Student'
                        });
                    }
                    await User.insertMany(studentUsers);

                    // Create Assignments for this section
                    for (const course of yearCourses) {
                        const eligible = teachers.filter(t => t.specialization === progData.domain);
                        const pool = faker.helpers.arrayElements(
                            eligible.length ? eligible : teachers,
                            Math.min(3, eligible.length || 3)
                        );

                        await CourseAssignment.create({
                            courseId: course._id,
                            sectionId: section._id,
                            theoryTeacherIds: pool.map(t => t._id),
                            labTeacherIds: course.labTotal > 0 ? pool.map(t => t._id) : []
                        });
                        progAssignments++;
                        totalSessionsCount += course.theorySessions.length + course.labSessions.length;
                    }
                }
            }
            programStats.push({ name: progData.name, assignments: progAssignments });
        }

        // --- VALIDATION & SUMMARY ---
        const capacity = CONFIG.ROOM_COUNT * 5 * 8;
        const utilization = totalSessionsCount / capacity;

        console.log('\n=======================================');
        console.log('📊 PRODUCTION SEED SANITY CHECK:');
        console.log('=======================================');
        programStats.forEach(stat => {
            console.log(`${stat.name.padEnd(20)}: ${stat.assignments} assignments`);
        });
        console.log('---------------------------------------');
        console.log(`Sections:         ${totalSectionsCount}`);
        console.log(`Students:         ${totalStudentsCount}`);
        console.log(`Faculty:          ${CONFIG.TEACHER_COUNT}`);
        console.log(`Total Sessions:   ${totalSessionsCount}`);
        console.log(`Room Capacity:    ${capacity}`);
        console.log(`Utilization:      ${(utilization * 100).toFixed(1)}%`);
        console.log('=======================================\n');

        // Create Admin User
        await User.create({ username: 'admin', password: 'password123', role: 'admin' });

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
};

seed();


