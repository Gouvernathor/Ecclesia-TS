import { min } from "@gouvernathor/python";
import { Collection } from "@gouvernathor/python/collections/abc";
import { Approval, Ranked, Score, Single } from "./ballot";

export interface DisagreementFunction<T, U> {
    (t: T, u: U): number;
}

export interface VotingToBallot<Voter, Candidate, Ballot> {
    (voter: Voter, candidates: Collection<Candidate>): Ballot;
}


/**
 * The most basic and widespread voting system :
 * the voter chooses one of the available candidates,
 * or (not implemented here) for none of them.
 */
export function singleVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Single<Candidate>> {
    return (voter, candidates) =>
        min(candidates, party => disagree(voter, party));
}

/**
 * The voter ranks all, or (not implemented here) some, of the candidates.
 */
export function orderingVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Ranked<Candidate>> {
    return (voter, candidates) =>
        Array.from(candidates).sort((a, b) => disagree(voter, a) - disagree(voter, b));
}

/**
 * The voter gives a score (or a grade) to each candidate.
 * The number of grades must be provided to the constructor.
 *
 * The implementation of this voting method is not as straightforward as the two previous ones,
 * even setting strategic voting aside.
 * What is to be considered to be the range of grades to cover ?
 * From nazis to angels, or from the worst present candidate to the best ?
 * The answer lies only in the minds of the voters.
 * The latter is more akin to orderingVote, so I implemented the former,
 * but it causes issues for lower grades so approvalVote uses the latter.
 *
 * In this implementation, the voter gives to each candidate
 * a score proportional to the raw disagreement.
 * This may yield situations where every party is graded 0,
 * especially with low nScores values.
 */
export function cardinalVote<Voter, Candidate>(
    { nScores, disagree }: {
        nScores: number,
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Score<Candidate>> {
    return (voter, candidates) =>
        new Map(Array.from(candidates, candidate => {
            const grade = Math.min(nScores - 1,
                    Math.floor(nScores) * (1 - disagree(voter, candidate)));
            return [candidate, grade];
        }));
}

/**
 * Alternative implementation of cardinalVote.
 * The candidate(s) the least disagreed with are given the maximum score (which is nScores-1),
 * the candidate(s) the most disagreed with (unless all candidates have the same raw disagreement) gets 0,
 * and the score of the other candidates is proportional (well, affine) between those values.
 */
export function balancedCardinalVote<Voter, Candidate>(
    { nScores, disagree }: {
        nScores: number,
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Score<Candidate>> {
    return (voter, candidates) => {
        const prefs = new Map(Array.from(candidates, candidate => [candidate, 1 - disagree(voter, candidate)]));
        const minPref = Math.min(...prefs.values());
        let maxPref = Math.max(...prefs.values());

        if (minPref !== maxPref) { // avoid division by zero
            maxPref -= minPref;
        }

        return new Map(Array.from(candidates, candidate => {
            const grade = Math.min(nScores - 1,
                Math.floor(nScores * (prefs.get(candidate)! - minPref) / maxPref));
            return [candidate, grade];
        }));
    };
}

/**
 * The voter approves or disapproves each of the candidates.
 *
 * Technically a special case of a cardinal/score vote where scores are 0 and 1,
 * but this one makes it open to additional attribution methods
 * (proportional ones for instance).
 * That's why the format it returns is not the same as with the cardinal vote.
 * If you want a scores-like ballot, use balancedCardinalVote({ nScores: 2 }) instead.
 */
export function approvalVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Approval<Candidate>> {
    const cardinal = balancedCardinalVote({ nScores: 2, disagree });
    return (voter, candidates) => {
        const scores = cardinal(voter, candidates);
        return new Set(Array.from(scores.keys())
            .filter(candidate => scores.get(candidate)! > 0));
    };
}
