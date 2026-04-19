% ============================================================
% TEST FACTS — minimal 2-section, 3-course schedule
% Used to validate Phase 1-8 distribution changes
% ============================================================

% Days
day(monday). day(tuesday). day(wednesday). day(thursday). day(friday).

% Time slots (1-8)
slot(1). slot(2). slot(3). slot(4). slot(5). slot(6). slot(7). slot(8).

% Teachers: name, max_hours_per_week
teacher(t_alice, 20).
teacher(t_bob,   20).
teacher(t_carol, 20).

% Rooms: name, type, capacity
room(r101, classroom, 60).
room(r102, classroom, 60).
room(lab1, lab, 40).

% Sections: name, strength
section(sec_a, 55).
section(sec_b, 50).

% Courses: name, type, total_hours, session_hours
course(math,    classroom, 4, 1).
course(physics, classroom, 4, 1).
course(chem_lab, lab,      2, 2).

% Which section takes which course
section_course(sec_a, math).
section_course(sec_a, physics).
section_course(sec_a, chem_lab).
section_course(sec_b, math).
section_course(sec_b, physics).

% Allowed teachers per course per section
allowed_teachers(math,     sec_a, [t_alice]).
allowed_teachers(math,     sec_b, [t_alice]).
allowed_teachers(physics,  sec_a, [t_bob]).
allowed_teachers(physics,  sec_b, [t_bob]).
allowed_teachers(chem_lab, sec_a, [t_carol]).
