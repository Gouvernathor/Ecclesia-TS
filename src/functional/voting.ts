import { min } from "@gouvernathor/python";
import { Counter } from "@gouvernathor/python/collections";
import { Collection } from "@gouvernathor/python/collections/abc";
import { createRandomObj, type RandomObjParam } from "../utils";
import { Ballots, Order, Scores, Simple } from "../ballots";

type HasOpinions = {disagree(other: HasOpinions): any}; // placeholder

export interface Voting<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>> {
    (voters: Collection<Voter>, candidates: Collection<Party>): B;
}


// TODO harmonize all random management seeding moments, across attribution/election/voting
/**
 * Turns a voting method into one in which the candidates are shuffled randomly
 * before being given to the actual voting method passed to this function.
 *
 * If a RNG instance is passed (through options), it will be used directly,
 * without reseeding, at each call of the voting method.
 *
 * If a seed is passed, the random object is reseeded
 * with the same seed at each call of the voting method,
 * making the resulting function return the same values for the same parameters
 * (assuming the passed base voting method does).
 * If you want the generator to be seeded only once with a given seed, and reused afterwards,
 * seed it yourself and pass it as a random object to this function.
 */
export function toShuffledVote<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>>(
    { voting, ...rest }: {
        voting: Voting<Voter, Party, B>,
    } & RandomObjParam,
): Voting<Voter, Party, B> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        const randomObj = createRandomObj(rest);
        const partees = randomObj.shuffled(candidates);
        return voting(voters, partees);
    };
}


// concrete implementations (no random shuffling included !)

/**
 * The most basic and widespread voting system : each voter casts one ballot for
 * one of the available candidates, or (not implemented here) for none of them.
 */
export function singleVote<Voter extends HasOpinions, Party extends HasOpinions>(
    {} = {}
): Voting<Voter, Party, Simple<Party>> {
    return (voters: Collection<Voter>,candidates: Collection<Party>): Simple<Party> => {
        const scores = Counter.fromkeys(candidates, 0);
        for (const voter of voters) {
            // find the party with which disagreement is minimal
            // add it a ballot
            scores.increment(min(candidates, party => voter.disagree(party)));
        }
        return scores;
    }
}

/**
 * Each voter ranks all, or (not implemented here) some, of the candidates.
 */
export function orderingVote<Voter extends HasOpinions, Party extends HasOpinions>(
    {} = {}
): Voting<Voter, Party, Order<Party>> {
    return (voters: Collection<Voter>,candidates: Collection<Party>): Order<Party> => {
        const order: Party[][] = [];
        for (const voter of voters) {
            order.push([...candidates]
                .sort((a, b) => voter.disagree(a) - voter.disagree(b)));
        }
        return order;
    }
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
export function cardinalVote<Voter extends HasOpinions, Party extends HasOpinions>(
    { nGrades }: {
        nGrades: number
    }
): Voting<Voter, Party, Scores<Party>> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        const scores = Scores.fromGrades<Party>(nGrades);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
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

/**
 * Alternative implementation of CardinalVote.
 */
export function balancedCardinalVote<Voter extends HasOpinions, Party extends HasOpinions>(
    { nGrades }: {
        nGrades: number
    }
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

/**
 * Each voter approves or disapproves each of the candidates
 *
 * Technically a special case of grading vote where grades are 0 and 1,
 * but it makes it open to additional attribution methods
 * (proportional ones for example).
 * That's why the format it returns is not the same as with the cardinal vote.
 * If you want a scores-like attribution, use balancedCardinalVote({ nGrades: 2 }) instead.
 */
export function approvalVote<Voter extends HasOpinions, Party extends HasOpinions>(
    {} = {}
): Voting<Voter, Party, Simple<Party>> {
    return (voters: Collection<Voter>,candidates: Collection<Party>): Simple<Party> => {
        const scores = approvalVote.cardinal(voters, candidates) as Scores<Party>;
        const approvals = new Counter<Party>();
        for (const [party, [_disapproval, approval]] of scores) {
            approvals.increment(party, approval);
        }
        return approvals;
    }
}
approvalVote.cardinal = balancedCardinalVote({ nGrades: 2 });
