:- module(solver, [main/1, solve_from_file/1]).
:- use_module(library(clpfd)).
:- use_module(library(http/json)).
:- use_module(library(time)).

:- use_module(domain).
:- use_module(constraints).
:- use_module(heuristics).
:- use_module(output).

:- dynamic teacher/2, room/3, section/2, course/4, section_course/2, allowed_teachers/3, unavailable/3, locked_assignment/4, day/1, slot/1.

main([File]) :-
    retractall(teacher(_, _)), retractall(room(_, _, _)), retractall(section(_, _)),
    retractall(course(_, _, _, _)), retractall(section_course(_, _)), retractall(allowed_teachers(_, _, _)),
    retractall(unavailable(_, _, _)), retractall(locked_assignment(_, _, _, _)),
    retractall(day(_)), retractall(slot(_)),
    
    consult(File),
    
    ( domain_build(Assignments, _MappingState) ->
        extract_vars(Assignments, Vars),
        apply_hard_constraints(Assignments),
        apply_heuristics(Assignments, Score),
        
        Strategies = [
            [ffc, bisect, max(Score)],
            [ff, bisect, max(Score)],
            [leftmost, bisect, max(Score)]
        ],
        
        findall(Sol, try_labeling(Strategies, Assignments, Score, Vars, Sol), RawSols),
        sort(RawSols, UniqueSols),
        reverse(UniqueSols, SortedSols),
        take(3, SortedSols, Top3),
        
        ( Top3 \= [] ->
            format_all_solutions(Top3, FormattedSols),
            Reply = _{ status: "success", solutions: FormattedSols }
        ;
            Reply = _{ status: "failure", solutions: [] }
        )
    ;
        Reply = _{ status: "failure", reason: "domain error", solutions: [] }
    ),
    json_write_dict(current_output, Reply),
    nl,
    halt(0).

try_labeling(Strategies, Assignments, Score, Vars, Score-Assignments) :-
    member(Strategy, Strategies),
    catch(call_with_time_limit(4.5, labeling(Strategy, Vars)), time_limit_exceeded, fail).

take(0, _, []).
take(_, [], []).
take(N, [X|Xs], [X|Ys]) :-
    N > 0, N1 is N - 1, take(N1, Xs, Ys).

extract_vars([], []).
extract_vars([assign(_, _, T, R, D, S) | Rest], [T, R, D, S | Vars]) :-
    extract_vars(Rest, Vars).

% Wrapper predicate for test.js
solve_from_file(File) :-
    main([File]).