:- module(heuristics, [apply_heuristics/2]).
:- use_module(library(clpfd)).

apply_heuristics(Assignments, Score) :-
    BaseScore = 500,

    eval_spread(Assignments, SpreadReward),
    eval_late_slots(Assignments, LatePenalty),
    eval_room_changes(Assignments, RoomChangePenalty),
    eval_parallel_bonus(Assignments, ParallelBonus),
    eval_compactness_bonus(Assignments, CompactnessBonus),
    eval_cluster_penalty(Assignments, ClusterPenalty),

    TotalScore #= BaseScore 
                  + SpreadReward 
                  + ParallelBonus
                  + CompactnessBonus
                  - LatePenalty 
                  - RoomChangePenalty
                  - ClusterPenalty,

    Score #= max(0, min(1000, TotalScore)).

% =====================================================================
% PARALLEL BONUS (STRONG)
% =====================================================================
eval_parallel_bonus(Assignments, Bonus) :-
    eval_parallel_days(1, 5, Assignments, 0, Bonus).

eval_parallel_days(Day, MaxDay, _, Acc, Acc) :- Day > MaxDay, !.
eval_parallel_days(Day, MaxDay, Assignments, Acc, Total) :-
    eval_parallel_slots(Day, 1, 8, Assignments, 0, DayBonus),
    NextAcc #= Acc + DayBonus,
    NextDay is Day + 1,
    eval_parallel_days(NextDay, MaxDay, Assignments, NextAcc, Total).

eval_parallel_slots(_, Slot, MaxSlot, _, Acc, Acc) :- Slot > MaxSlot, !.
eval_parallel_slots(Day, Slot, MaxSlot, Assignments, Acc, Total) :-
    count_sections_in_slot(Assignments, Day, Slot, Count),
    (Count #>= 2 -> SlotBonus #= 12 ; SlotBonus #= 0), % 🔥 increased
    NextAcc #= Acc + SlotBonus,
    NextSlot is Slot + 1,
    eval_parallel_slots(Day, NextSlot, MaxSlot, Assignments, NextAcc, Total).

count_sections_in_slot([], _, _, 0).
count_sections_in_slot([assign(_, _, _, _, D, S)|Rest], Day, Slot, Count) :-
    count_sections_in_slot(Rest, Day, Slot, RestCount),
    (D #= Day, S #= Slot -> Count #= RestCount + 1 ; Count = RestCount).

% =====================================================================
% COMPACTNESS BONUS
% =====================================================================
eval_compactness_bonus(Assignments, Bonus) :-
    findall((Sec, C), (solver:section(Sec, _), solver:section_course(Sec, C)), SecCourses),
    eval_compactness_loop(SecCourses, Assignments, 0, Bonus).

eval_compactness_loop([], _, B, B).
eval_compactness_loop([(Sec, C)|Rest], Assignments, Acc, Total) :-
    get_course_slot_range(Assignments, Sec, C, MinSlot, MaxSlot),
    (   MinSlot = 0
    ->  CourseBonus #= 0
    ;   Spread #= MaxSlot - MinSlot,
        (Spread #=< 1 -> CourseBonus #= 20 ; 
         Spread #=< 2 -> CourseBonus #= 15 ;
         CourseBonus #= 0)
    ),
    NextAcc #= Acc + CourseBonus,
    eval_compactness_loop(Rest, Assignments, NextAcc, Total).

get_course_slot_range(Assignments, TargetSec, TargetCourse, MinSlot, MaxSlot) :-
    findall(S, (
        member(assign(Sec, C, _, _, _, S), Assignments),
        Sec == TargetSec,
        C == TargetCourse
    ), Slots),
    (   Slots = []
    ->  MinSlot = 0, MaxSlot = 0
    ;   min_member(MinSlot, Slots),
        max_member(MaxSlot, Slots)
    ).

% =====================================================================
% CLUSTER PENALTY (MOST IMPORTANT 🔥)
% =====================================================================
eval_cluster_penalty(Assignments, Penalty) :-
    findall((Sec,C), (solver:section(Sec,_), solver:section_course(Sec,C)), Pairs),
    cluster_loop(Pairs, Assignments, 0, Penalty).

cluster_loop([], _, P, P).
cluster_loop([(Sec,C)|Rest], A, Acc, Total) :-
    findall(Day,
        member(assign(Sec,C,_,_,Day,_), A),
        Days),
    sort(Days, UniqueDays),

    length(Days, TotalSlots),
    length(UniqueDays, UniqueCount),

    Cluster is TotalSlots - UniqueCount,
    NextAcc #= Acc + (Cluster * 20),  % 🔥 strong penalty

    cluster_loop(Rest, A, NextAcc, Total).

% =====================================================================
% SPREAD REWARD (IMPROVED)
% =====================================================================
eval_spread(Assignments, SpreadReward) :-
    findall((Sec, C), (solver:section(Sec, _), solver:section_course(Sec, C)), SecCourses),
    eval_spread_loop(SecCourses, Assignments, 0, SpreadReward).

eval_spread_loop([], _, R, R).
eval_spread_loop([(Sec, C)|Rest], Assignments, Acc, TotalReward) :-
    get_days_active(Assignments, Sec, C, DaysActive),
    sum(DaysActive, #=, UniqueDays),
    Reward #= UniqueDays * 15, % 🔥 increased
    NextAcc #= Acc + Reward,
    eval_spread_loop(Rest, Assignments, NextAcc, TotalReward).

get_days_active(Assignments, Sec, C, [M, T, W, Th, F]) :-
    check_day_active(Assignments, Sec, C, 1, M),
    check_day_active(Assignments, Sec, C, 2, T),
    check_day_active(Assignments, Sec, C, 3, W),
    check_day_active(Assignments, Sec, C, 4, Th),
    check_day_active(Assignments, Sec, C, 5, F).

check_day_active([], _, _, _, 0).
check_day_active([assign(S1, C1, _, _, D1, _)|Rest], Sec, C, Day, Active) :-
    check_day_active(Rest, Sec, C, Day, RestActive),
    Match in 0..1,
    (S1 == Sec, C1 == C -> Match #<==> (D1 #= Day) ; Match = 0),
    Active #= max(Match, RestActive).

% =====================================================================
% LATE SLOT PENALTY
% =====================================================================
eval_late_slots([], 0).
eval_late_slots([assign(_, _, _, _, _, S)|Rest], Penalty) :-
    eval_late_slots(Rest, RestPenalty),
    Late in 0..1,
    Late #<==> (S #>= 7),
    Penalty #= RestPenalty + (Late * 5).

% =====================================================================
% ROOM CHANGE PENALTY
% =====================================================================
eval_room_changes(Assignments, RoomPenalty) :-
    findall(Sec, solver:section(Sec, _), Secs),
    eval_rc_loop(Secs, Assignments, 0, RoomPenalty).

eval_rc_loop([], _, P, P).
eval_rc_loop([Sec|Rest], Assignments, Acc, Total) :-
    eval_rc_days(Sec, 1, Assignments, 0, SecP),
    NextAcc #= Acc + SecP,
    eval_rc_loop(Rest, Assignments, NextAcc, Total).

eval_rc_days(_, 6, _, P, P).
eval_rc_days(Sec, Day, Assignments, Acc, Total) :-
    extract_rooms_for_day(Assignments, Sec, Day, 1, R1),
    extract_rooms_for_day(Assignments, Sec, Day, 2, R2),
    extract_rooms_for_day(Assignments, Sec, Day, 3, R3),
    extract_rooms_for_day(Assignments, Sec, Day, 4, R4),
    extract_rooms_for_day(Assignments, Sec, Day, 5, R5),
    extract_rooms_for_day(Assignments, Sec, Day, 6, R6),
    extract_rooms_for_day(Assignments, Sec, Day, 7, R7),
    extract_rooms_for_day(Assignments, Sec, Day, 8, R8),

    count_changes([R1,R2,R3,R4,R5,R6,R7,R8], 0, DayChanges),
    NextAcc #= Acc + (DayChanges * 5),
    NextDay is Day + 1,
    eval_rc_days(Sec, NextDay, Assignments, NextAcc, Total).

extract_rooms_for_day([], _, _, _, 0).
extract_rooms_for_day([assign(S1, _, _, R1, D1, Sl1)|Rest], Sec, Day, Slot, Out) :-
    extract_rooms_for_day(Rest, Sec, Day, Slot, RestOut),
    (S1 == Sec ->
        Match in 0..1,
        Match #<==> (D1 #= Day #/\ Sl1 #= Slot),
        Out #= max(Match * R1, RestOut)
    ; Out = RestOut).

count_changes([], C, C).
count_changes([_], C, C).
count_changes([R1, R2 | Rest], Acc, Total) :-
    Change in 0..1,
    Change #<==> (R1 #\= 0 #/\ R2 #\= 0 #/\ R1 #\= R2),
    NextAcc #= Acc + Change,
    count_changes([R2 | Rest], NextAcc, Total).

% =====================================================================
% HELPERS
% =====================================================================
member(X, [X|_]).
member(X, [_|T]) :- member(X, T).

min_member(X, [X]).
min_member(X, [H|T]) :-
    min_member(Y, T),
    (H @=< Y -> X = H ; X = Y).

max_member(X, [X]).
max_member(X, [H|T]) :-
    max_member(Y, T),
    (H @>= Y -> X = H ; X = Y).