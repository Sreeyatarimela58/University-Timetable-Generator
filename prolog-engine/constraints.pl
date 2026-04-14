:- module(constraints, [apply_hard_constraints/1]).
:- use_module(library(clpfd)).
:- use_module(domain). % To access teacher_data, room_data, day_data.

% Entry Point
apply_hard_constraints(Assignments) :-
    apply_pairwise_clashes(Assignments),
    apply_unique_slots(Assignments),   % 🔥 ADD THIS
    apply_room_rules(Assignments),
    apply_teacher_workload(Assignments),
    apply_fact_unavailable(Assignments),
    apply_single_teacher_per_course(Assignments),
    apply_lab_lunch_rule(Assignments),
    apply_lunch_constraint(Assignments),
    apply_teacher_fatigue(Assignments),
    apply_section_fatigue(Assignments).

% 1, 2, 3, 4: Clash Constraints Pairwise
apply_pairwise_clashes([]).
apply_pairwise_clashes([A|Rest]) :-
    apply_clash_to_rest(A, Rest),
    apply_pairwise_clashes(Rest).

apply_clash_to_rest(_, []).
apply_clash_to_rest(A1, [A2|Rest]) :-
    A1 = assign(Sec1, _, T1, R1, D1, S1),
    A2 = assign(Sec2, _, T2, R2, D2, S2),

    SameTime in 0..1,
    SameTime #<==> (D1 #= D2 #/\ S1 #= S2),

    % STRICT CLASHES
    SameTime #==> (T1 #\= T2),   % Teacher clash
    SameTime #==> (R1 #\= R2),   % Room clash

    % Section cannot have 2 classes at same time
   (Sec1 = Sec2 -> SameTime #= 0 ; true),

    apply_clash_to_rest(A1, Rest).

% 5, 6: Room Capacity & Type
apply_room_rules([]).
apply_room_rules([assign(Sec, C, _, R, _, _) | Rest]) :-
    solver:section(Sec, Strength),
    solver:course(C, Type, _, _),
    
    findall(RID, (
        room_data(RID, _, RType, Cap),
        Cap >= Strength,
        (Type == lab -> RType == lab ; RType == classroom)
    ), ValidRooms),
    
    ( ValidRooms \= [] ->
        build_domain(ValidRooms, Dom),
        R in Dom
    ; 
        R in 0..0 % Fail if no room matches
    ),
    apply_room_rules(Rest).

build_domain([X], X).
build_domain([X | Rest], X \/ Dom) :-
    Rest \= [],
    build_domain(Rest, Dom).

% 7: Teacher Workload
apply_teacher_workload(Assignments) :-
    findall(TID, teacher_data(TID, _, _), TIDs),
    check_teacher_workload(TIDs, Assignments).

check_teacher_workload([], _).
check_teacher_workload([TID|Rest], Assignments) :-
    teacher_data(TID, _, MaxH),
    count_teacher_slots(Assignments, TID, Slots),
    sum(Slots, #=, Total),
    Total #=< MaxH,
    check_teacher_workload(Rest, Assignments).

count_teacher_slots([], _, []).
count_teacher_slots([assign(_,_,T,_,_,_)|Rest], TID, [B|BRest]) :-
    B in 0..1,
    B #<==> (T #= TID),
    count_teacher_slots(Rest, TID, BRest).

% 8: Teacher Availability & Allowed Teachers
apply_fact_unavailable(Assignments) :-
    apply_allowed_teachers(Assignments),
    findall(unav(TID, DID, SNum), 
            (solver:unavailable(TAtom, DAtom, SNum), teacher_data(TID, TAtom, _), day_data(DID, DAtom)),
            Unavs),
    apply_unavs_loop(Assignments, Unavs).

apply_allowed_teachers([]).
apply_allowed_teachers([assign(Sec, C, T, _, _, _) | Rest]) :-
    ( solver:allowed_teachers(C, Sec, AllowedAtoms) ->
        map_teacher_atoms(AllowedAtoms, AllowedInts),
        ( AllowedInts \= [] -> build_domain(AllowedInts, Dom), T in Dom ; T in 0..0 )
    ; true ),
    apply_allowed_teachers(Rest).

apply_unavs_loop([], _).
apply_unavs_loop([assign(_, _, T, _, D, S) | Rest], Unavs) :-
    apply_unav_single(Unavs, T, D, S),
    apply_unavs_loop(Rest, Unavs).

apply_unav_single([], _, _, _).
apply_unav_single([unav(TID, DID, SNum) | Rest], T, D, S) :-
    (T #= TID #/\ D #= DID) #==> (S #\= SNum),
    apply_unav_single(Rest, T, D, S).

% 9: Single Teacher Per Course
apply_single_teacher_per_course([]).
apply_single_teacher_per_course([A|Rest]) :-
    enforce_single_teacher(A, Rest),
    apply_single_teacher_per_course(Rest).

enforce_single_teacher(_, []).
enforce_single_teacher(A1, [A2|Rest]) :-
    A1 = assign(Sec1, C1, T1, _, _, _),
    A2 = assign(Sec2, C2, T2, _, _, _),
    ( Sec1 == Sec2, C1 == C2 ->
        T1 #= T2
    ; true ),
    enforce_single_teacher(A1, Rest).

% 12: Lab Lunch Restriction
apply_lab_lunch_rule([]).
apply_lab_lunch_rule([assign(_, C, _, _, _, S) | Rest]) :-
    ( solver:course(C, lab, _, _) ->
        % A lab cannot occupy BOTH slot 4 and 5
        % Since lab requires 2 consecutive slots natively, prohibiting StartSlot=4 guarantees it won't cross 4 and 5.
        S #\= 4
    ; true ),
    apply_lab_lunch_rule(Rest).

% 13: Lunch Constraint
apply_lunch_constraint(Assignments) :-
    findall(Sec, solver:section(Sec, _), Secs),
    apply_lunch_sections(Secs, Assignments).

apply_lunch_sections([], _).
apply_lunch_sections([Sec|Rest], Assignments) :-
    apply_lunch_section_days(Sec, 1, Assignments),
    apply_lunch_sections(Rest, Assignments).

apply_lunch_section_days(_, 6, _).
apply_lunch_section_days(Sec, Day, Assignments) :-
    Day =< 5,
    get_bool_vars(Assignments, Sec, Day, 4, B4),
    get_bool_vars(Assignments, Sec, Day, 5, B5),
    sum(B4, #=, Sum4),
    sum(B5, #=, Sum5),
    Sum4 + Sum5 #=< 1,
    NextDay is Day + 1,
    apply_lunch_section_days(Sec, NextDay, Assignments).

get_bool_vars([], _, _, _, []).
get_bool_vars([assign(SecA, _, _, _, D, Slot)|Rest], Sec, Day, TargetSlot, [B|BRest]) :-
    B in 0..1,
    (SecA == Sec ->
        B #<==> (D #= Day #/\ Slot #= TargetSlot)
    ; B = 0),
    get_bool_vars(Rest, Sec, Day, TargetSlot, BRest).

% 14: Teacher Fatigue
apply_teacher_fatigue(Assignments) :-
    findall(TID, teacher_data(TID, _, _), TIDs),
    apply_tc_loop(TIDs, Assignments).

apply_tc_loop([], _).
apply_tc_loop([TID|Rest], Assignments) :-
    apply_tc_days(TID, 1, Assignments),
    apply_tc_loop(Rest, Assignments).

apply_tc_days(_, 6, _).
apply_tc_days(TID, Day, Assignments) :-
    Day =< 5,
    get_teacher_bool_vars(Assignments, TID, Day, 1, [S1,S2,S3,S4,S5,S6,S7,S8]),
    S1+S2+S3+S4+S5 #=< 4,
    S2+S3+S4+S5+S6 #=< 4,
    S3+S4+S5+S6+S7 #=< 4,
    S4+S5+S6+S7+S8 #=< 4,
    NextDay is Day + 1,
    apply_tc_days(TID, NextDay, Assignments).

get_teacher_bool_vars(_, _, _, 9, []).
get_teacher_bool_vars(Assignments, TID, Day, Slot, [SumB | RestB]) :-
    get_tbv(Assignments, TID, Day, Slot, ListB),
    sum(ListB, #=, SumB),
    NextSlot is Slot + 1,
    get_teacher_bool_vars(Assignments, TID, Day, NextSlot, RestB).

get_tbv([], _, _, _, []).
get_tbv([assign(_, _, T, _, D, S)|Rest], TID, Day, Slot, [B|BRest]) :-
    B in 0..1,
    B #<==> (T #= TID #/\ D #= Day #/\ S #= Slot),
    get_tbv(Rest, TID, Day, Slot, BRest).

% 15: Section Fatigue
apply_section_fatigue(Assignments) :-
    findall(Sec, solver:section(Sec, _), Secs),
    apply_sc_loop(Secs, Assignments).

apply_sc_loop([], _).
apply_sc_loop([Sec|Rest], Assignments) :-
    apply_sc_days(Sec, 1, Assignments),
    apply_sc_loop(Rest, Assignments).

apply_sc_days(_, 6, _).
apply_sc_days(Sec, Day, Assignments) :-
    Day =< 5,
    get_sec_bool_vars(Assignments, Sec, Day, 1, [S1,S2,S3,S4,S5,S6,S7,S8]),
    S1+S2+S3+S4+S5 #=< 4,
    S2+S3+S4+S5+S6 #=< 4,
    S3+S4+S5+S6+S7 #=< 4,
    S4+S5+S6+S7+S8 #=< 4,
    NextDay is Day + 1,
    apply_sc_days(Sec, NextDay, Assignments).

get_sec_bool_vars(_, _, _, 9, []).
get_sec_bool_vars(Assignments, Sec, Day, Slot, [SumB | RestB]) :-
    get_bool_vars(Assignments, Sec, Day, Slot, ListB),
    sum(ListB, #=, SumB),
    NextSlot is Slot + 1,
    get_sec_bool_vars(Assignments, Sec, Day, NextSlot, RestB).

apply_unique_slots(Assignments) :-
    findall((Sec,Course), solver:section_course(Sec,Course), Pairs),
    enforce_unique_slots(Pairs, Assignments).

enforce_unique_slots([], _).
enforce_unique_slots([(Sec,Course)|Rest], Assignments) :-
    findall(Slot,
        member(assign(Sec,Course,_,_,_,Slot), Assignments),
        Slots),
    all_distinct(Slots),
    enforce_unique_slots(Rest, Assignments).