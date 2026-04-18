:- module(domain, [domain_build/2, teacher_data/3, room_data/4, day_data/2, map_teacher_atoms/2]).
:- use_module(library(clpfd)).

:- dynamic teacher_data/3.
:- dynamic room_data/4.
:- dynamic day_data/2.

domain_build(Assignments, state(TLen, RLen)) :-
    retractall(teacher_data(_, _, _)),
    retractall(room_data(_, _, _, _)),
    retractall(day_data(_, _)),
    
    findall(T-Hours, solver:teacher(T, Hours), Teachers),
    map_teachers(Teachers, 1, TLen),
    
    findall(room(R, Type, Cap), solver:room(R, Type, Cap), Rooms),
    map_rooms(Rooms, 1, RLen),
    
    findall(D, solver:day(D), Days),
    map_days(Days, 1, _DLen),
    
    findall(task(Sec, Course, TotalHours, SessionHours), 
            (solver:section_course(Sec, Course), solver:course(Course, _, TotalHours, SessionHours)), 
            Tasks),
    
    build_assignments(Tasks, TLen, RLen, Assignments).

map_teachers([], IntID, Last) :- Last is IntID - 1.
map_teachers([T-Hours|Rest], IntID, Last) :-
    assertz(teacher_data(IntID, T, Hours)),
    NextID is IntID + 1,
    map_teachers(Rest, NextID, Last).

map_rooms([], IntID, Last) :- Last is IntID - 1.
map_rooms([room(R, Type, Cap)|Rest], IntID, Last) :-
    assertz(room_data(IntID, R, Type, Cap)),
    NextID is IntID + 1,
    map_rooms(Rest, NextID, Last).

map_days([], IntID, Last) :- Last is IntID - 1.
map_days([D|Rest], IntID, Last) :-
    assertz(day_data(IntID, D)),
    NextID is IntID + 1,
    map_days(Rest, NextID, Last).

build_assignments([], _, _, []).
build_assignments([task(Sec, Course, Total, Consecutive) | RestTasks], TLen, RLen, Assignments) :-
    NumGroups is Total div Consecutive,
    build_groups(Sec, Course, NumGroups, Consecutive, TLen, RLen, GroupAssignments),
    build_assignments(RestTasks, TLen, RLen, RestAssignments),
    append(GroupAssignments, RestAssignments, Assignments).

build_groups(_, _, 0, _, _, _, []).
build_groups(Sec, Course, NumGroups, Consecutive, TLen, RLen, FinalAss) :-
    NumGroups > 0,
    length(GroupList, Consecutive),
    create_group(GroupList, Sec, Course, TLen, RLen, _Teacher, _Room, _GroupDay, _StartSlot),
    NextGroups is NumGroups - 1,
    build_groups(Sec, Course, NextGroups, Consecutive, TLen, RLen, RestAss),
    append(GroupList, RestAss, FinalAss).

create_group(List, Sec, Course, TLen, RLen, Teacher, Room, Day, StartSlot) :-
    Teacher in 0..TLen,
    Room in 0..RLen,
    findall(D, solver:day(D), Days),
    length(Days, DLen),
    Day in 0..DLen,

    findall(S, solver:slot(S), Slots),
    list_to_fdset(Slots, FDSet),
    StartSlot in_set FDSet,
    length(List, Len),
    EndSlot in 1..8,
    EndSlot #= StartSlot + Len - 1,
    fill_group(List, Sec, Course, Teacher, Room, Day, StartSlot).

fill_group([], _, _, _, _, _, _).
fill_group([assign(Sec, Course, Teacher, Room, Day, RealSlot, Status) | Rest], Sec, Course, Teacher, Room, Day, S) :-
    Status in 0..1,
    RealSlot in 0..8,
    Status #= 0 #==> Teacher #= 0 #/\ Room #= 0 #/\ Day #= 0 #/\ RealSlot #= 0,
    Status #= 1 #==> Teacher #> 0 #/\ Room #> 0 #/\ Day #> 0 #/\ RealSlot #= S,
    NextS #= S + 1,
    fill_group(Rest, Sec, Course, Teacher, Room, Day, NextS).

map_teacher_atoms([], []).
map_teacher_atoms([Atom | Rest], [Int | RestI]) :-
    ( teacher_data(Int, Atom, _) -> true ; fail ),
    map_teacher_atoms(Rest, RestI).
