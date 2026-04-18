:- module(output, [format_all_solutions/2, validate_timetable/1]).
:- use_module(library(json)).
:- use_module(domain).

format_all_solutions([], []).
format_all_solutions([Score-Assignments|Rest], [Dict|RestOut]) :-
    map_assignments_to_json(Assignments, TimetableJson),
    validate_timetable(Assignments),
    Dict = _{ score: Score, timetable: TimetableJson },
    format_all_solutions(Rest, RestOut).

% Validate that timetable constraints are met (warnings only, don't fail)
validate_timetable(Assignments) :-
    validate_room_clashes(Assignments),
    validate_teacher_clashes(Assignments),
    validate_section_clashes(Assignments),
    !.  % Cut to prevent backtracking into validation

% Check no two different sections at same time in same room
validate_room_clashes([]).
validate_room_clashes([A|Rest]) :-
    validate_room_clash_single(A, Rest),
    validate_room_clashes(Rest).

validate_room_clash_single(_, []).
validate_room_clash_single(A1, [A2|Rest]) :-
    A1 = assign(Sec1, _, _, R1, D1, S1),
    A2 = assign(Sec2, _, _, R2, D2, S2),
    ( Sec1 \== Sec2, D1 == D2, S1 == S2, R1 == R2 ->
        format(atom(_), 'Room clash: Sections ~w and ~w both in room ~w at day ~w slot ~w~n', [Sec1, Sec2, R1, D1, S1])
    ; true ),
    validate_room_clash_single(A1, Rest).

% Check no same teacher at two different places at same time
validate_teacher_clashes([]).
validate_teacher_clashes([A|Rest]) :-
    validate_teacher_clash_single(A, Rest),
    validate_teacher_clashes(Rest).

validate_teacher_clash_single(_, []).
validate_teacher_clash_single(A1, [A2|Rest]) :-
    A1 = assign(_, _, T1, _, D1, S1),
    A2 = assign(_, _, T2, _, D2, S2),
    ( T1 == T2, D1 == D2, S1 == S2 ->
        format(atom(_), 'Teacher clash: Teacher ~w at same time in different places~n', [T1])
    ; true ),
    validate_teacher_clash_single(A1, Rest).

% Check same section-course not at same time
validate_section_clashes([]).
validate_section_clashes([A|Rest]) :-
    validate_section_clash_single(A, Rest),
    validate_section_clashes(Rest).

validate_section_clash_single(_, []).
validate_section_clash_single(A1, [A2|Rest]) :-
    A1 = assign(Sec1, C1, _, _, D1, S1),
    A2 = assign(Sec2, C2, _, _, D2, S2),
    ( Sec1 == Sec2, C1 == C2, D1 == D2, S1 == S2 ->
        format(atom(_), 'Duplicate slot: Section ~w course ~w appears twice at day ~w slot ~w~n', [Sec1, C1, D1, S1])
    ; true ),
    validate_section_clash_single(A1, Rest).

map_assignments_to_json([], []).
map_assignments_to_json([assign(Sec, Course, T_Int, R_Int, D_Int, S, Status) | Rest], [Dict | RestJson]) :-
    ( Status == 1 ->
        teacher_data(T_Int, T_Atom, _),
        room_data(R_Int, R_Atom, _, _),
        day_data(D_Int, D_Atom),
        Dict = _{
            sectionId: Sec,
            courseId: Course,
            teacherId: T_Atom,
            roomId: R_Atom,
            day: D_Atom,
            slot: S,
            status: 1
        }
    ;
        Dict = _{
            sectionId: Sec,
            courseId: Course,
            teacherId: 'none',
            roomId: 'none',
            day: 'none',
            slot: 0,
            status: 0
        }
    ),
    map_assignments_to_json(Rest, RestJson).
