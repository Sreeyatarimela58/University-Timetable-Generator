% test5_final.pl

% ---------------- TEACHERS ----------------
teacher(t1, 12).
teacher(t2, 12).
teacher(t3, 12).

% ---------------- ROOMS ----------------
room(r1, classroom, 60).
room(r2, classroom, 60).
room(r3, classroom, 60).

% ---------------- SECTIONS ----------------
section(sec1, 60).
section(sec2, 60).
section(sec3, 60).

% ---------------- COURSES ----------------
course(c1, theory, 3, 1).
course(c2, theory, 3, 1).

% ---------------- SECTION-COURSE ----------------
section_course(sec1, c1).
section_course(sec1, c2).

section_course(sec2, c1).
section_course(sec2, c2).

section_course(sec3, c1).
section_course(sec3, c2).

% ---------------- ALLOWED TEACHERS ----------------
allowed_teachers(c1, sec1, [t1]).
allowed_teachers(c1, sec2, [t2]).
allowed_teachers(c1, sec3, [t3]).

allowed_teachers(c2, sec1, [t2]).
allowed_teachers(c2, sec2, [t3]).
allowed_teachers(c2, sec3, [t1]).

% ---------------- TIME ----------------
day(mon).
day(tue).
day(wed).

slot(1).
slot(2).
slot(3).
slot(4).   % 🔥 added one extra slot for flexibility