import { NumberCounter, DefaultMap } from "@gouvernathor/python/collections";
import { Approval, Ranked, Score, Single } from "./ballot";
import { Simple, Order, Scores } from "./tally";

export function tallySingleToSimple<Candidate>(
    ballots: Iterable<Single<Candidate>>,
): Simple<Candidate> {
    return NumberCounter.fromKeys(ballots);
}

export function tallyApprovalToSimple<Candidate>(
    ballots: Iterable<Approval<Candidate>>,
): Simple<Candidate> {
    return NumberCounter.fromKeys(Array.from(ballots).flatMap(b => Array.from(b)));
}

export function tallyRankedToOrder<Candidate>(
    ballots: Iterable<Ranked<Candidate>>,
): Order<Candidate> {
    return Array.from(ballots);
}

/**
 * This function assumes that the scores in each ballot are 0-based,
 * going from 0, inclusive, to nScores, exclusive.
 */
export function tallyScoreToScores<Candidate>(
    ballots: Iterable<Score<Candidate>>,
    { nScores }: { nScores: number },
): Scores<Candidate> {
    const rawScores = new DefaultMap<Candidate, number[]>(() => Array(nScores).fill(0));
    for (const ballot of ballots) {
        for (const [candidate, scoreBasedOn0] of ballot.entries()) {
            rawScores.get(candidate)[scoreBasedOn0]! += 1;
        }
    }
    return Scores.fromEntries(Array.from(rawScores.entries()));
}
