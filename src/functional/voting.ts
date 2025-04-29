import { min } from "@gouvernathor/python";
import { Counter } from "@gouvernathor/python/collections";
import { Collection } from "@gouvernathor/python/collections/abc";
import { createRandomObj } from "../utils";
import { Ballots, Order, Scores, Simple } from "../ballots";

type HasOpinions = {disagree(other: HasOpinions): any}; // placeholder

export interface Voting<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>> {
    (voters: Collection<Voter>, candidates: Collection<Party>): B;
}


// if passed a key, the resulting voting method will be pure/stable
// TODO harmonize all random management seeding moments, across attribution/election/voting
export function toShuffledVote<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>>(
    { voting, ...rest }: {
        voting: Voting<Voter, Party, B>,
    } & Record<string, any>,
): Voting<Voter, Party, B> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        const randomObj = createRandomObj(rest);
        const partees = randomObj.shuffled(candidates);
        return voting(voters, partees);
    };
}


// concrete implementations (no random shuffling !)

export function singleVote<Voter extends HasOpinions, Party extends HasOpinions>(
    voters: Collection<Voter>,
    candidates: Collection<Party>,
): Simple<Party> {
    const scores = Counter.fromkeys(candidates, 0);
    for (const voter of voters) {
        // find the party with which disagreement is minimal
        // add it a ballot
        scores.increment(min(candidates, party => voter.disagree(party)));
    }
    return scores;
}

export function orderingVote<Voter extends HasOpinions, Party extends HasOpinions>(
    voters: Collection<Voter>,
    candidates: Collection<Party>,
): Order<Party> {
    const order: Party[][] = [];
    for (const voter of voters) {
        order.push([...candidates]
            .sort((a, b) => voter.disagree(a) - voter.disagree(b)));
    }
    return order;
}

export function cardinalVoteFromNGrades<Voter extends HasOpinions, Party extends HasOpinions>(
    nGrades: number,
): Voting<Voter, Party, Scores<Party>> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        const scores = Scores.fromGrades<Party>(nGrades);

        for (const voter of voters) {
            for (const party of candidates) {
                const grade = Math.min(nGrades - 1,
                    Math.floor(nGrades) * (1 - voter.disagree(party)));
                (scores.get(party) as number[])[grade]++;
            }
        }
        return scores;
    };
}

export function balancedCardinalVoteFromNGrades<Voter extends HasOpinions, Party extends HasOpinions>(
    nGrades: number,
): Voting<Voter, Party, Scores<Party>> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        const scores = Scores.fromGrades<Party>(nGrades);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            const prefs = new Map(Array.from(candidates, party => [party, 1 - voter.disagree(party)]));
            const minPref = Math.min(...prefs.values());
            let maxPref = Math.max(...prefs.values());

            if (minPref !== maxPref) { // avoid division by zero
                maxPref -= minPref;
            }

            for (const party of candidates) {
                const grade = Math.min(nGrades - 1,
                    Math.floor(nGrades * (prefs.get(party)! - minPref) / maxPref));
                (scores.get(party) as number[])[grade]++;
            }
        }
        return scores;
    };
}

export function approvalVote<Voter extends HasOpinions, Party extends HasOpinions>(
    voters: Collection<Voter>,
    candidates: Collection<Party>,
): Simple<Party> {
    const scores = approvalVote.cardinal(voters, candidates) as Scores<Party>;
    const approvals = new Counter<Party>();
    for (const [party, [_disapproval, approval]] of scores) {
        approvals.increment(party, approval);
    }
    return approvals;
}
approvalVote.cardinal = balancedCardinalVoteFromNGrades(2);
