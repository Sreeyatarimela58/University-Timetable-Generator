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

// Deterministic Seeding
faker.seed(1337);

const CONFIG = {
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/uni-timetable-gen',
    PROGRAMS: [
        { name: 'Computer Science & Engineering', domain: 'CSE' },
        { name: 'Electronics & Comm. Engineering', domain: 'ECE' },
        { name: 'Business Administration', domain: 'MBA' }
    ],
    YEARS_PER_PROG: 3,
    SECTIONS_PER_YEAR: 2,
    COURSES_PER_YEAR: 6,
    BASE_SESSIONS_PER_COURSE: 7, // Hours
    LAB_PROBABILITY: 0.45,       // Hits target utilization more reliably
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
        Generation.deleteMany({})
    ]);
    await Generation.create({ name: 'Production Cycle 2026', status: 'ACTIVE' });
};

const seed = async () => {
    try {
        await mongoose.connect(CONFIG.MONGO_URI);
        await clearDB();

        // 1. Create Rooms
        const rooms = [];
        const labCount = Math.round(CONFIG.ROOM_COUNT * CONFIG.LAB_ROOM_RATIO); // 7
        for (let i = 0; i < labCount; i++) {
            rooms.push(await Room.create({ name: `LAB-${i+1}`, type: 'lab', capacity: 60 }));
        }
        for (let i = 0; i < (CONFIG.ROOM_COUNT - labCount); i++) {
            rooms.push(await Room.create({ name: `RM-${100+i}`, type: 'classroom', capacity: 80 }));
        }

        // 2. Create Teachers
        const teachers = [];
        for (let i = 0; i < CONFIG.TEACHER_COUNT; i++) {
            teachers.push(await Teacher.create({
                name: `Prof. ${faker.person.lastName()}`,
                specialization: faker.helpers.arrayElement(CONFIG.PROGRAMS.map(p => p.domain)),
                maxHoursPerWeek: 40,
                unavailableSlots: []
            }));
        }

        // 3. Create Programs, Years, Sections
        let totalSectionsCount = 0;
        let totalSessionsCount = 0;
        const allAssignments = [];

        for (const progData of CONFIG.PROGRAMS) {
            const program = await Program.create({ name: progData.name, durationYears: CONFIG.YEARS_PER_PROG });
            
            for (let yr = 1; yr <= CONFIG.YEARS_PER_PROG; yr++) {
                const year = await AcademicYear.create({ programId: program._id, yearNumber: yr });
                
                // Create Courses for this year
                const yearCourses = [];
                for (let c = 1; c <= CONFIG.COURSES_PER_YEAR; c++) {
                    const hasLab = Math.random() < CONFIG.LAB_PROBABILITY;
                    const course = await Course.create({
                        programId: program._id,
                        yearId: year._id,
                        name: `${progData.domain} Core ${yr}0${c}`,
                        code: `${progData.domain}-${yr}0${c}`,
                        theoryTotal: 7,
                        theorySessions: [1, 1, 1, 1, 1, 1, 1],
                        labTotal: hasLab ? 2 : 0,
                        labSessions: hasLab ? [2] : []
                    });
                    yearCourses.push(course);
                }

                // Create Sections for this year
                for (let s = 1; s <= CONFIG.SECTIONS_PER_YEAR; s++) {
                    const section = await Section.create({
                        programId: program._id,
                        yearId: year._id,
                        name: String.fromCharCode(64 + s),
                        strength: 50
                    });
                    totalSectionsCount++;

                    // Create Assignments for this section
                    for (const course of yearCourses) {
                        // Pick 2-3 teachers for the pool
                        const pool = faker.helpers.arrayElements(teachers, faker.number.int({ min: 2, max: 3 }));
                        const assignment = await CourseAssignment.create({
                            courseId: course._id,
                            sectionId: section._id,
                            theoryTeacherIds: pool.map(t => t._id),
                            labTeacherIds: course.labTotal > 0 ? pool.map(t => t._id) : []
                        });
                        allAssignments.push(assignment);
                        totalSessionsCount += course.theorySessions.length + course.labSessions.length;
                    }
                }
            }
        }

        // --- VALIDATION ---
        const capacity = CONFIG.ROOM_COUNT * 5 * 8; // 25 * 5 * 8 = 1000
        const utilization = totalSessionsCount / capacity;

        console.log('\n=======================================');
        console.log('📊 PRODUCTION SEED SANITY CHECK:');
        console.log('=======================================');
        console.log(`Sections:         ${totalSectionsCount} (Target: 18)`);
        console.log(`Total Sessions:   ${totalSessionsCount}`);
        console.log(`Room Capacity:    ${capacity}`);
        console.log(`Utilization:      ${(utilization * 100).toFixed(1)}%`);
        console.log(`Expected Util:    80% - 85%`);
        console.log('=======================================\n');

        if (utilization < 0.80 || utilization > 0.85) {
            console.error('❌ VALIDATION FAILED: Utilization outside target range.');
        } else {
            console.log('✅ VALIDATION PASSED.');
        }

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);
        await User.create({ username: 'admin', password: passwordHash, role: 'admin' });

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
};

seed();
