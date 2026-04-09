import { BigIntCounter, DefaultMap } from "@gouvernathor/python/collections";
import { Approval, Score, Single } from "../../election/ballot";
import { Scores, Simple } from "./tally";

export function tallySingleToSimple<Candidate>(
    ballots: Iterable<Single<Candidate>>,
): Simple<Candidate> {
    return BigIntCounter.fromKeys(ballots);
}

export function tallyApprovalToSimple<Candidate>(
    ballots: Iterable<Approval<Candidate>>,
): Simple<Candidate> {
    return BigIntCounter.fromKeys(Array.from(ballots).flatMap(b => Array.from(b)));
}

/**
 * This function assumes that the scores in each ballot are 0-based,
 * going from 0, inclusive, to nScores, exclusive.
 */
export function tallyScoreToScores<Candidate>(
    ballots: Iterable<Score<Candidate>>,
    { nScores }: { nScores: number },
): Scores<Candidate> {
    const rawScores = new DefaultMap<Candidate, bigint[]>(() => Array(nScores).fill(0n));
    for (const ballot of ballots) {
        for (const [candidate, scoreBasedOn0] of ballot.entries()) {
            rawScores.get(candidate)[scoreBasedOn0]! += 1n;
        }
    }
    if (rawScores.size === 0) {
        return Scores.fromGrades(nScores);
    }
    return Scores.fromEntries(Array.from(rawScores.entries()));
}
