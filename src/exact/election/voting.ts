import { BigIntCounter, DefaultMap } from "@gouvernathor/python/collections";
import { Fraction } from "@gouvernathor/fraction.ts";
import { Order } from "../../election/tally";
import { Voting } from "../../election/voting";
import { Scores, Simple } from "./tally";
import { DisagreementFunction } from "./voting-to-ballot";
import { FRAC1, max, min, minBy } from "../_util";

/**
 * The most basic and widespread voting system : each voter casts one ballot for
 * one of the available candidates, or (not implemented here) for none of them.
 */
export function singleVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): Voting<Voter, Candidate, Simple<Candidate>> {
    return (voters, candidates) => {
        return BigIntCounter.fromKeys(Array.from(voters, voter =>
            minBy(candidates, party => disagree(voter, party))));
    };
}

/**
 * Each voter ranks all, or (not implemented here) some, of the candidates.
 */
export function orderingVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): Voting<Voter, Candidate, Order<Candidate>> {
    return (voters, candidates) => {
        const order: Candidate[][] = [];
        for (const voter of voters) {
            order.push([...candidates]
                .sort((a, b) => Fraction.compare(disagree(voter, a), disagree(voter, b))));
        }
        return order;
    };
}

/**
 * Each voter gives a note (or grade) to each candidate.
 * The number of grades must be provided to the constructor.
 *
 * This one is not as straightforward as the two previous ones, even setting
 * strategic voting aside.
 * What is to be considered to be the range of grades to cover ?
 * From nazis to angels, or from the worst present candidate to the best ?
 * The answer lies only in the minds of the voters.
 * The latter is more akin to OrderingVote, so I made the former the default,
 * but it causes issues for lower grades so ApprovalVote uses the latter.
 *
 * In this implementation, each voter gives a grade to each party
 * proportional to the raw disagreement. This may yield situations
 * where every party is graded 0, especially with low ngrades values.
 */
export function cardinalVote<Voter, Candidate>(
    { nGrades, disagree }: {
        nGrades: number,
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): Voting<Voter, Candidate, Scores<Candidate>> {
    return (voters, candidates) => {
        const scores = new DefaultMap<Candidate, bigint[]>(() => Array(nGrades).fill(0n));

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            for (const party of candidates) {
                const grade = min([
                    nGrades - 1,
                    (FRAC1.sub(disagree(voter, party))).mul(Math.floor(nGrades)),
                ]);
                scores.get(party)[+grade]!++;
            }
        }
        return Scores.fromEntries([...scores]);
    };
}

/**
 * Alternative implementation of CardinalVote.
 */
export function balancedCardinalVote<Voter, Candidate>(
    { nGrades, disagree }: {
        nGrades: number,
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): Voting<Voter, Candidate, Scores<Candidate>> {
    return (voters, candidates) => {
        const scores = Scores.fromGrades<Candidate>(nGrades);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            const prefs = new Map(Array.from(candidates, party => [party, FRAC1.sub(disagree(voter, party))]));
            const minPref = min(prefs.values());
            let maxPref = max(prefs.values());

            if (minPref !== maxPref) { // avoid division by zero
                maxPref = maxPref.sub(minPref);
            }

            for (const party of candidates) {
                const grade = min([
                    nGrades - 1,
                    prefs.get(party)!.sub(minPref).mul(nGrades).div(maxPref).floor(),
                ]);
                (scores.get(party) as bigint[])[Number(grade)]!++;
            }
        }
        return scores;
    };
}

/**
 * Each voter approves or disapproves each of the candidates
 *
 * Technically a special case of grading vote where grades are 0 and 1,
 * but it makes it open to additional attribution methods
 * (proportional ones for example).
 * That's why the format it returns is not the same as with the cardinal vote.
 * If you want a scores-like attribution, use balancedCardinalVote({ nGrades: 2 }) instead.
 */
export function approvalVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): Voting<Voter, Candidate, Simple<Candidate>> {
    const cardinal = balancedCardinalVote({ nGrades: 2, disagree });
    return (voters, candidates) => {
        const scores = cardinal(voters, candidates);
        return BigIntCounter.fromEntries(Array.from(scores.entries(),
            ([party, [_disapproval, approval]]) => [party, approval!]));
    };
}
