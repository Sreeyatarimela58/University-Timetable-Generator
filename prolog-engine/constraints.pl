:- module(constraints, [apply_hard_constraints/1]).
:- use_module(library(clpfd)).
:- use_module(domain). % To access teacher_data, room_data, day_data.

% Entry Point
apply_hard_constraints(Assignments) :-
    apply_pairwise_clashes(Assignments),
    apply_room_rules(Assignments),
    apply_teacher_workload(Assignments),
    apply_fact_unavailable(Assignments),
    apply_single_teacher_per_course(Assignments),
    apply_lab_lunch_rule(Assignments),
    apply_lunch_constraint(Assignments),
    apply_teacher_fatigue(Assignments),
    apply_section_fatigue(Assignments),
    apply_daily_load_cap(Assignments),          % Phase 4: max classes/day
    apply_subject_day_cap(Assignments),         % Phase 5: max 2 same course/day
    apply_slot_spacing(Assignments).            % Phase 6: Slot Spacing

% 1, 2, 3, 4: Clash Constraints Pairwise
apply_pairwise_clashes([]).
apply_pairwise_clashes([A|Rest]) :-
    apply_clash_to_rest(A, Rest),
    apply_pairwise_clashes(Rest).

apply_clash_to_rest(_, []).
apply_clash_to_rest(A1, [A2|Rest]) :-
    A1 = assign(Sec1, _, T1, R1, D1, S1, Status1),
    A2 = assign(Sec2, _, T2, R2, D2, S2, Status2),

    SameTime in 0..1,
    SameTime #<==> (D1 #= D2 #/\ S1 #= S2),

    % STRICT CLASHES
    (Status1 #= 1 #/\ Status2 #= 1 #/\ SameTime #= 1) #==> (T1 #\= T2),   % Teacher clash
    (Status1 #= 1 #/\ Status2 #= 1 #/\ SameTime #= 1) #==> (R1 #\= R2),   % Room clash

    % Section cannot have 2 classes at same time
   (Sec1 == Sec2 -> ((Status1 #= 1 #/\ Status2 #= 1) #==> SameTime #= 0) ; true),

    apply_clash_to_rest(A1, Rest).

% 5, 6: Room Capacity & Type
apply_room_rules([]).
apply_room_rules([assign(Sec, C, _, R, _, _, Status) | Rest]) :-
    solver:section(Sec, Strength),
    solver:course(C, Type, _, _),
    
    findall(RID, (
        room_data(RID, _, RType, Cap),
        Cap >= Strength,
        (Type == lab -> RType == lab ; RType == classroom)
    ), ValidRooms),
    
    ( ValidRooms \= [] ->
        build_domain(ValidRooms, Dom),
        Status #= 1 #==> R in Dom
    ; 
        Status #= 0 % Fail softly by forcing unscheduled
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
count_teacher_slots([assign(_,_,T,_,_,_,Status)|Rest], TID, [B|BRest]) :-
    B in 0..1,
    B #<==> (Status #= 1 #/\ T #= TID),
    count_teacher_slots(Rest, TID, BRest).

% 8: Teacher Availability & Allowed Teachers
apply_fact_unavailable(Assignments) :-
    apply_allowed_teachers(Assignments),
    findall(unav(TID, DID, SNum), 
            (solver:unavailable(TAtom, DAtom, SNum), teacher_data(TID, TAtom, _), day_data(DID, DAtom)),
            Unavs),
    apply_unavs_loop(Assignments, Unavs),
    
    findall(unavR(RID, DID, SNum), 
            (solver:unavailable_room(RAtom, DAtom, SNum), room_data(RID, RAtom, _, _), day_data(DID, DAtom)),
            UnavRooms),
    apply_runavs_loop(Assignments, UnavRooms).

apply_allowed_teachers([]).
apply_allowed_teachers([assign(Sec, C, T, _, _, _, Status) | Rest]) :-
    ( solver:allowed_teachers(C, Sec, AllowedAtoms) ->
        map_teacher_atoms(AllowedAtoms, AllowedInts),
        ( AllowedInts \= [] -> build_domain(AllowedInts, Dom), Status #= 1 #==> T in Dom ; Status #= 0 )
    ; true ),
    apply_allowed_teachers(Rest).

apply_unavs_loop([], _).
apply_unavs_loop([assign(_, _, T, _, D, S, Status) | Rest], Unavs) :-
    apply_unav_single(Unavs, T, D, S, Status),
    apply_unavs_loop(Rest, Unavs).

apply_unav_single([], _, _, _, _).
apply_unav_single([unav(TID, DID, SNum) | Rest], T, D, S, Status) :-
    (Status #= 1 #/\ T #= TID #/\ D #= DID) #==> (S #\= SNum),
    apply_unav_single(Rest, T, D, S, Status).

apply_runavs_loop([], _).
apply_runavs_loop([assign(_, _, _, R, D, S, Status) | Rest], UnavRooms) :-
    apply_runav_single(UnavRooms, R, D, S, Status),
    apply_runavs_loop(Rest, UnavRooms).

apply_runav_single([], _, _, _, _).
apply_runav_single([unavR(RID, DID, SNum) | Rest], R, D, S, Status) :-
    (Status #= 1 #/\ R #= RID #/\ D #= DID) #==> (S #\= SNum),
    apply_runav_single(Rest, R, D, S, Status).

% 9: Single Teacher Per Course
apply_single_teacher_per_course([]).
apply_single_teacher_per_course([A|Rest]) :-
    enforce_single_teacher(A, Rest),
    apply_single_teacher_per_course(Rest).

enforce_single_teacher(_, []).
enforce_single_teacher(A1, [A2|Rest]) :-
    A1 = assign(Sec1, C1, T1, _, _, _, Status1),
    A2 = assign(Sec2, C2, T2, _, _, _, Status2),
    ( Sec1 == Sec2, C1 == C2 ->
        (Status1 #= 1 #/\ Status2 #= 1) #==> T1 #= T2
    ; true ),
    enforce_single_teacher(A1, Rest).

% 12: Lab Lunch Restriction
apply_lab_lunch_rule([]).
apply_lab_lunch_rule([assign(_, C, _, _, _, S, Status) | Rest]) :-
    ( solver:course(C, lab, _, _) ->
        Status #= 1 #==> S #\= 4
    ; true ),
    apply_lab_lunch_rule(Rest).

% 13: Lunch Constraint
apply_lunch_constraint(_) :- solver:relax_lunch, !.
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
get_bool_vars([assign(SecA, _, _, _, D, Slot, Status)|Rest], Sec, Day, TargetSlot, [B|BRest]) :-
    B in 0..1,
    (SecA == Sec ->
        B #<==> (Status #= 1 #/\ D #= Day #/\ Slot #= TargetSlot)
    ; B = 0),
    get_bool_vars(Rest, Sec, Day, TargetSlot, BRest).

% 14: Teacher Fatigue
apply_teacher_fatigue(_) :- solver:relax_fatigue, !.
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
    S1+S2+S3+S4+S5 #=< 5,
    S2+S3+S4+S5+S6 #=< 5,
    S3+S4+S5+S6+S7 #=< 5,
    S4+S5+S6+S7+S8 #=< 5,
    NextDay is Day + 1,
    apply_tc_days(TID, NextDay, Assignments).

get_teacher_bool_vars(_, _, _, 9, []).
get_teacher_bool_vars(Assignments, TID, Day, Slot, [SumB | RestB]) :-
    get_tbv(Assignments, TID, Day, Slot, ListB),
    sum(ListB, #=, SumB),
    NextSlot is Slot + 1,
    get_teacher_bool_vars(Assignments, TID, Day, NextSlot, RestB).

get_tbv([], _, _, _, []).
get_tbv([assign(_, _, T, _, D, S, Status)|Rest], TID, Day, Slot, [B|BRest]) :-
    B in 0..1,
    B #<==> (Status #= 1 #/\ T #= TID #/\ D #= Day #/\ S #= Slot),
    get_tbv(Rest, TID, Day, Slot, BRest).

% 15: Section Fatigue
apply_section_fatigue(_) :- solver:relax_fatigue, !.
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
    S1+S2+S3+S4+S5 #=< 5,
    S2+S3+S4+S5+S6 #=< 5,
    S3+S4+S5+S6+S7 #=< 5,
    S4+S5+S6+S7+S8 #=< 5,
    NextDay is Day + 1,
    apply_sc_days(Sec, NextDay, Assignments).

get_sec_bool_vars(_, _, _, 9, []).
get_sec_bool_vars(Assignments, Sec, Day, Slot, [SumB | RestB]) :-
    get_bool_vars(Assignments, Sec, Day, Slot, ListB),
    sum(ListB, #=, SumB),
    NextSlot is Slot + 1,
    get_sec_bool_vars(Assignments, Sec, Day, NextSlot, RestB).

% =======================================================================
% PHASE 4: Daily Load Cap
% Ensures no single day gets more than ceil(TotalAssignments / NumDays)
% active (Status=1) assignments across ALL sections.
% Formula: MaxPerDay = ceil(Total / 5)
% =======================================================================
apply_daily_load_cap(Assignments) :-
    length(Assignments, Total),
    ( Total =:= 0 -> true ;
        MaxPerDay is (Total + 4) // 5,
        apply_load_cap_days(1, 5, MaxPerDay, Assignments)
    ).

apply_load_cap_days(Day, MaxDay, _, _) :- Day > MaxDay, !.
apply_load_cap_days(Day, MaxDay, Max, Assignments) :-
    Day =< MaxDay,
    count_active_on_day(Assignments, Day, Bools),
    sum(Bools, #=, DayCount),
    DayCount #=< Max,
    NextDay is Day + 1,
    apply_load_cap_days(NextDay, MaxDay, Max, Assignments).

count_active_on_day([], _, []).
count_active_on_day([assign(_, _, _, _, D, _, Status) | Rest], Day, [B | BRest]) :-
    B in 0..1,
    B #<==> (Status #= 1 #/\ D #= Day),
    count_active_on_day(Rest, Day, BRest).

% =======================================================================
% PHASE 5: Subject/Day Cap
% Ensures no (section, course) pair is placed more than 2 times
% on the same day. Prevents subject clustering within a single day.
% =======================================================================
apply_subject_day_cap(Assignments) :-
    findall((Sec, C),
        (solver:section(Sec, _), solver:section_course(Sec, C)),
        RawPairs),
    sort(RawPairs, Pairs),
    apply_sdc_loop(Pairs, Assignments).

apply_sdc_loop([], _).
apply_sdc_loop([(Sec, C) | Rest], Assignments) :-
    apply_sdc_days(Sec, C, 1, 5, Assignments),
    apply_sdc_loop(Rest, Assignments).

apply_sdc_days(_, _, Day, MaxDay, _) :- Day > MaxDay, !.
apply_sdc_days(Sec, C, Day, MaxDay, Assignments) :-
    Day =< MaxDay,
    count_sc_on_day(Assignments, Sec, C, Day, Bools),
    sum(Bools, #=, Count),
    Count #=< 2,   % At most 2 slots of the same course per section per day
    NextDay is Day + 1,
    apply_sdc_days(Sec, C, NextDay, MaxDay, Assignments).

count_sc_on_day([], _, _, _, []).
count_sc_on_day([assign(SecA, CA, _, _, D, _, Status) | Rest], Sec, C, Day, [B | BRest]) :-
    B in 0..1,
    ( SecA == Sec, CA == C ->
        B #<==> (Status #= 1 #/\ D #= Day)
    ; B = 0 ),
    count_sc_on_day(Rest, Sec, C, Day, BRest).

% =======================================================================
% PHASE 6: Slot Spacing
% Ensures gaps between scheduled slots to prevent front-loaded clustering.
% Prevents 3+ consecutive slots (allows 2-hour labs, forces gap after).
% =======================================================================
apply_slot_spacing(Assignments) :-
    findall(Sec, solver:section(Sec, _), Secs),
    apply_spacing_loop(Secs, Assignments).

apply_spacing_loop([], _).
apply_spacing_loop([Sec|Rest], Assignments) :-
    apply_spacing_days(Sec, 1, 5, Assignments),
    apply_spacing_loop(Rest, Assignments).

apply_spacing_days(_, Day, MaxDay, _) :- Day > MaxDay, !.
apply_spacing_days(Sec, Day, MaxDay, Assignments) :-
    Day =< MaxDay,
    get_sec_bool_vars(Assignments, Sec, Day, 1, Bools),
    enforce_slot_spacing(Bools),
    NextDay is Day + 1,
    apply_spacing_days(Sec, NextDay, MaxDay, Assignments).

enforce_slot_spacing([B1, B2, B3, B4, B5, B6, B7, B8]) :-
    B1 + B2 + B3 #=< 2,
    B2 + B3 + B4 #=< 2,
    B3 + B4 + B5 #=< 2,
    B4 + B5 + B6 #=< 2,
    B5 + B6 + B7 #=< 2,
    B6 + B7 + B8 #=< 2.