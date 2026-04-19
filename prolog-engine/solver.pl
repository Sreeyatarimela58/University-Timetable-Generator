:- module(solver, [main/1, solve_from_file/1]).
:- use_module(library(clpfd)).
:- use_module(library(json)).
:- use_module(library(time)).

:- use_module(domain).
:- use_module(constraints).
:- use_module(heuristics).
:- use_module(output).

:- dynamic teacher/2, room/3, section/2, course/4, section_course/2, allowed_teachers/3, unavailable/3, unavailable_room/3, locked_assignment/4, day/1, slot/1, relax_fatigue/0, relax_lunch/0.

main([File]) :-
    retractall(teacher(_, _)), retractall(room(_, _, _)), retractall(section(_, _)),
    retractall(course(_, _, _, _)), retractall(section_course(_, _)), retractall(allowed_teachers(_, _, _)),
    retractall(unavailable(_, _, _)), retractall(unavailable_room(_, _, _)), retractall(locked_assignment(_, _, _, _)),
    retractall(day(_)), retractall(slot(_)), retractall(relax_fatigue), retractall(relax_lunch),
    
    consult(File),
    
    ( domain_build(Assignments, _MappingState) ->
        extract_vars(Assignments, Vars, StatusVars),
        apply_hard_constraints(Assignments),
        
        sum(StatusVars, #=, TotalScheduled),
        length(StatusVars, TotalAssigns),
        TotalScheduled #=< TotalAssigns, % Upper bound for efficiency

        apply_heuristics(Assignments, Score),

        % ---------------------------------------------------------------
        % THREE-TIER FALLBACK STRATEGY + EMERGENCY 4th TIER
        % ---------------------------------------------------------------
        (
            % TIER 1: High-quality maximized schedule (3.5s timeout)
            catch(
                call_with_time_limit(3.5, (
                    MinRequired is TotalAssigns * 7 // 10,
                    TotalScheduled #>= MinRequired,
                    labeling([max(TotalScheduled), ffc, bisect, down], Vars),
                    StateStr = "optimal"
                )),
                time_limit_exceeded,
                (
                    writeln(user_error, 'TIMEOUT_RECOVERY'), 
                    once(labeling([ffc, bisect, down], Vars)),
                    StateStr = "timeout_recovery"
                )
            )
        ;
            % TIER 3: Any valid solution — drop quality floor
            writeln(user_error, 'QUALITY_FALLBACK'),
            once(labeling([ffc], Vars)),
            StateStr = "partial"
        ),

        % ---------------------------------------------------------------
        % PHASE 6: Debug logging — emits placement stats to stderr
        % ---------------------------------------------------------------
        ( integer(TotalScheduled) ->
            format(user_error,
                '[DEBUG] Scheduled=~w/~w | State=~w~n',
                [TotalScheduled, TotalAssigns, StateStr])
        ; format(user_error, '[DEBUG] State=~w | Count still FD var~n', [StateStr])
        ),

        % ---------------------------------------------------------------
        % TIER 4 (Emergency Fallback): if 0 classes placed, relax soft
        % constraints (fatigue + lunch) and re-label once more.
        % ---------------------------------------------------------------
        ( TotalScheduled =:= 0 ->
            writeln(user_error, 'EMERGENCY_RELAXED_CONSTRAINTS'),
            assertz(relax_fatigue),
            assertz(relax_lunch),
            once(labeling([ffc], Vars)),
            FinalState = "emergency_relaxed"
        ;
            FinalState = StateStr
        ),

        % Collect result
        ( TotalScheduled == 0 -> OverallState = "infeasible" ; OverallState = FinalState ),
        format_all_solutions([Score-Assignments], FormattedSols),
        Reply = _{ status: "success", solverState: OverallState, solutions: FormattedSols }
    ;
        Reply = _{ status: "failure", reason: "domain error", solutions: [] }
    ),
    json_write_dict(current_output, Reply),
    nl,
    halt(0).

extract_vars([], [], []).
extract_vars([assign(_, _, T, R, D, S, Status) | Rest], [T, R, D, S | Vars], [Status | SVars]) :-
    extract_vars(Rest, Vars, SVars).

% Wrapper predicate for test.js
solve_from_file(File) :-
    main([File]).