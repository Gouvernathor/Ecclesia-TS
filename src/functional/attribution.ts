import { Counter, DefaultMap } from "@gouvernathor/python/collections";
import { divmod, enumerate, max, min } from "@gouvernathor/python";
import { fmean, median } from "@gouvernathor/python/statistics";
import RNG from "@gouvernathor/rng";
import { Ballots, Order, Scores, Simple } from "../ballots";

/**
 * To be thrown when an attribution fails to attribute seats,
 * but only in a case where it's an expected limitation of the attribution method.
 * The typical example being the Condorcet standoff, or a majority threshold,
 * but a tie could be another example (though they are usually not checked in provided implementations).
 *
 * Other errors may and will be raised by the attribution methods for other reasons,
 * such as invalid input data, division by zero...
 */
export class AttributionFailure extends Error { }

/**
 * A function to manage how the results from the ballots
 * translate into an allocation of seats.
 *
 * If the attribution method is expected, by design, to fail under expected conditions,
 * such as a majority threshold not being reached,
 * this method should raise an AttributionFailure error.
 *
 * @param votes The ballots.
 * @param rest This parameter, ignored in most cases,
 * forces the attributions taking more required or optional parameters
 * to take them as an options object.
 *
 * @returns The attribution of seats to the parties based upon the votes.
 * It is a Counter mapping each party to the number of seats it won.
 * The return value's total() should be equal to the nSeats attributes - if any.
 */
export interface Attribution<Party, B extends Ballots<Party>> {
    (votes: B, rest?: Record<string, any>): Counter<Party>;
}

/**
 * Most attributions should generally implement this interface,
 * which reflects that the number of seats they allocate is always the same.
 *
 * However, some attributions may yield variable numbers of seats,
 * for instance the pre-2024 federal German system.
 */
export interface HasNSeats { readonly nSeats: number };


/**
 * Transforms a standard proportional attribution method into one that requires a certain threshold
 * (percentage of the total votes) to be reached by the parties in order to receive seats.
 * Mostly useful for proportional attribution methods -
 * but works for any simple-ballot-based attribution method.
 *
 * Replaces the Proportional class implementation.
 *
 * @param threshold The threshold, between 0 and 1
 * @param contingency The fallback attribution in case the threshold is not reached by any party.
 * It takes an Attribution, or undefined (the default), or null.
 * Null in this case has the specific behavior that if no party reaches the threshold,
 * an AttributionFailure error will be raised.
 * If undefined (or nothing is passed), the contingency will default to running
 * the same attribution method without the threshold.
 * @param attribution The votes passed to this attribution method are guaranteed to be above the threshold,
 * except if the contingency is undefined and no party reached the threshold
 * (in that case, all parties will be passed).
 */
export function addThresholdToSimpleAttribution<Party>(
    { threshold, contingency, attribution }: {
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
        attribution: Attribution<Party, Simple<Party>>,
    }
): Attribution<Party, Simple<Party>> {
    // const threshold_ = threshold;
    if (contingency === undefined) {
        // contingency = (votes: Simple<Party>, rest) => {
        //     threshold = 0;
        //     try {
        //         return attrib(votes, rest);
        //     } finally {
        //         threshold = threshold_;
        //     }
        // };
        contingency = attribution;
    }

    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        if (threshold > 0) {
            const original_votes = votes;
            const votes_threshold = threshold * votes.total;
            votes = new Counter<Party>([...votes.entries()].filter(([_, v]) => v >= votes_threshold));
            if (votes.size === 0) {
                if (contingency === null) {
                    throw new AttributionFailure("No party reached the threshold");
                }
                return contingency(original_votes, rest);
            }
        }
        return attribution(votes, rest);
    };
    return attrib;
}

/**
 * A function that should be pure : it should not take into account
 * any value other than the arguments passed to it.
 *
 * @param t The fraction of votes received by a candidate
 * @param a The number of seats already allocated to that candidate
 * @returns A value that should be increasing as t rises, and decreasing as a rises.
 * The higher the return value, the more likely the candidate is to receive another seat.
 */
export interface RankIndexFunction {
    (t: number, a: number): number;
};

/**
 * A function creating a fixed-seats, proportional, rank-index attribution method
 * from a rank-index function.
 *
 * The implementation is optimized so as to call rankIndexFunction as few times as possible.
 *
 * Replaces the RankIndexMethod class implementation.
 */
export function proportionalFromRankIndexFunction<Party>(
    { nSeats, rankIndexFunction }: {
        nSeats: number,
        rankIndexFunction: RankIndexFunction,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const allVotes = votes.total;
        const fractions = new Map([...votes.entries()].map(([party, v]) => [party, v / allVotes]));

        const rankIndexValues = new Map([...fractions.entries()].map(([party, f]) => [party, rankIndexFunction(f, 0)]));

        const parties = [...votes.keys()].sort((a, b) => rankIndexValues.get(a)! - rankIndexValues.get(b)!);

        const seats = new Counter<Party>();

        s: for (let sn = 0; sn < nSeats; sn++) {
            const winner = parties.pop()!;
            seats.increment(winner);
            rankIndexValues.set(winner, rankIndexFunction(fractions.get(winner)!, seats.get(winner)!));
            for (let pn = 0; pn < parties.length; pn++) {
                if (rankIndexValues.get(parties[pn])! >= rankIndexValues.get(winner)!) {
                    parties.splice(pn, 0, winner);
                    continue s;
                }
            }
            parties.push(winner);
        }

        return seats;
    };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * A function that should be pure.
 * @param k The number of seats already allocated to a party
 * @returns A value that should be increasing as k rises
 */
export interface DivisorFunction {
    (k: number): number;
};

function rankIndexFunctionFromDivisorFunction(
    divisorFunction: DivisorFunction
): RankIndexFunction {
    return (t, a) => t / divisorFunction(a);
}

/**
 * A function creating a divisor method -
 * one kind of rank-index attribution, itself a kind of proportional attribution.
 */
export function proportionalFromDivisorFunction<Party>(
    { nSeats, divisorFunction }: {
        nSeats: number,
        divisorFunction: DivisorFunction,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    return proportionalFromRankIndexFunction({
        nSeats,
        rankIndexFunction: rankIndexFunctionFromDivisorFunction(divisorFunction),
    });
}


// Majority methods

// TODO: inline, no point if no inheritance (and change the exception message)
function majority<Party>(
    { nSeats, threshold, contingency }: {
        nSeats: number,
        threshold: number,
        contingency: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const win = max(votes.keys(), p => votes.get(p)!);

        if ((votes.get(win)! / votes.total) > threshold) {
            return new Counter([[win, nSeats]]);
        }
        if (contingency === null) {
            throw new AttributionFailure("No majority winner");
        }
        return contingency(votes, rest);
    };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which
 * the party with the most votes wins all the seats.
 */
export function plurality<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    return majority<Party>({
        nSeats,
        threshold: 0,
        contingency: null,
    });
}

/**
 * Creates an attribution method in which a candidate needs to reach
 * a certain percentage of the votes in order to win all the seats.
 *
 * If not party reaches the threshold, the contingency attribution method is called,
 * or if no contingency is provided, an AttributionFailure error is thrown.
 */
export function superMajority<Party>(
    { nSeats, threshold, contingency = null }: {
        nSeats: number,
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    return majority<Party>({
        nSeats,
        threshold,
        contingency,
    });
}


// Ordering-based methods

/**
 * Creates an attribution method in which the party with the least votes is eliminated,
 * and its votes are redistributed to the other parties according to the voters' preferences.
 * Repeats until a party reaches a majority of the remaining votes, winning all the seats.
 *
 * The ballots are not required to rank all the candidates.
 */
export function instantRunoff<Party>(
    { nSeats }: {
        nSeats: number
    }
): Attribution<Party, Order<Party>> & HasNSeats {
    const attrib = (votes: Order<Party>, rest = {}): Counter<Party> => {
        const blacklisted = new Set<Party>();

        const nParties = new Set(votes.flat()).size;
        for (let pn = 0; pn < nParties; pn++) {
            const firstPlaces = new Counter<Party>();
            for (const ballot of votes) {
                for (const party of ballot) {
                    if (!blacklisted.has(party)) {
                        firstPlaces.increment(party);
                        break;
                    }
                }
            }

            const total = firstPlaces.total;
            for (const [party, score] of firstPlaces) {
                if (score / total > .5) {
                    return new Counter([[party, nSeats]]);
                }
            }
            blacklisted.add(min(firstPlaces.keys(), p => firstPlaces.get(p)!));
        }
        throw new Error("Should not happen");
    };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which each party receives points according
 * to the position it occupies on each ballot, and the party with the most points wins all the seats.
 *
 * Uses the Modified Borda Count, in which the least-ranked candidate gets 1 point,
 * and unranked candidates get 0 points.
 * So, the ballots are not required to rank all the candidates.
 */
export function bordaCount<Party>(
    { nSeats }: {
        nSeats: number
    }
): Attribution<Party, Order<Party>> & HasNSeats {
    const attrib = (votes: Order<Party>, rest = {}): Counter<Party> => {
        const scores = new Counter<Party>();
        for (const ballot of votes) {
            for (const [i, party] of enumerate(ballot.slice().reverse(), 1)) {
                scores.increment(party, i);
            }
        }
        return new Counter([[max(scores.keys(), p => scores.get(p)!), nSeats]]);
    };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which each party is matched against each other party,
 * and the party winning each of its matchups wins all the seats.
 * If no party wins against all others, the attribution fails.
 *
 * Doesn't support candidates with equal ranks, due to the Order type format.
 * This implementation also doesn't support incomplete ballots.
 *
 * @param contingency An optional contingency attribution method to use in case of a standoff.
 * If not provided (or null), the attribution will fail with a condorcet.Standoff error,
 * which is a subclass of AttributionFailure.
 */
export function condorcet<Party>(
    { nSeats, contingency = null }: {
        nSeats: number,
        contingency?: Attribution<Party, Order<Party>> | null,
    }
): Attribution<Party, Order<Party>> & HasNSeats {
    const attrib = (votes: Order<Party>, rest = {}): Counter<Party> => {
        const counts = new DefaultMap<Party, Counter<Party>>(() => new Counter());
        const majority= votes.length / 2;

        for (const ballot of votes) {
            for (const [i, party1] of enumerate(ballot)) {
                for (const party2 of ballot.slice(i + 1)) {
                    counts.get(party1)!.increment(party2);
                }
            }
        }

        const win = new Set(counts.keys());
        for (const [party, partyCounter] of counts) {
            for (const value of partyCounter.pos.values()) {
                if (value > majority) {
                    win.delete(party);
                    break;
                }
            }
        }

        if (win.size !== 1) {
            if (win.size !== 0) {
                throw new Error("Bad attribution");
            }
            if (contingency === null) {
                throw new condorcet.Standoff("No Condorcet winner");
            }
            return contingency(votes, rest);
        }
        const [winner] = win;
        return new Counter([[winner, nSeats]]);
    };
    attrib.nSeats = nSeats;
    return attrib;
}
condorcet.Standoff = class extends AttributionFailure {};


// Score-based methods

/**
 * Creates an attribution method in which all the seats go to the candidate with the highest average score.
 *
 * The ballots are not required to grade all the candidates.
 */
export function averageScore<Party>(
    { nSeats }: {
        nSeats: number
    }
): Attribution<Party, Scores<Party>> & HasNSeats {
    const attrib = (votes: Scores<Party>, rest = {}): Counter<Party> => {
        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        return new Counter([[max(counts.keys(), party => fmean(counts.get(party)!)), nSeats]]);
    }
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which all the seats go to the candidate with the highest median score.
 *
 * If there is a tie, the contingency method is called on the candidates that are tied.
 * The default contingency is to take the maximum average score.
 *
 * The ballots are not required to grade all the candidates.
 */
export function medianScore<Party>(
    { nSeats, contingency }: {
        nSeats: number,
        contingency?: Attribution<Party, Scores<Party>>,
    }
): Attribution<Party, Scores<Party>> & HasNSeats {
    if (contingency === undefined) {
        contingency = averageScore({ nSeats });
    }

    const attrib = (votes: Scores<Party>, rest = {}): Counter<Party> => {
        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        const medians = new Map([...counts.entries()]
            .map(([party, partigrades]) => [party, median(partigrades)]));

        const winScore = Math.max(...medians.values());
        const [winner, ...winners] = [...medians.keys()].filter(p => medians.get(p) === winScore);

        if (winners.length === 0) { // no tie
            return new Counter([[winner, nSeats]]);
        }

        winners.unshift(winner);
        const trimmedResults = Scores.fromEntries(winners.map(party => [party, counts.get(party)!]));
        return contingency(trimmedResults, rest);
    };
    attrib.nSeats = nSeats;
    return attrib;
}


// Proportional methods

export function dHondt<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: k => k + 1,
    });
}
export const highestAveragesProportional = dHondt;
export const jefferson = dHondt;

export function webster<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: k => 2 * k + 1, // int math is better than k + .5
    });
}
export const sainteLague = webster;

export function hare<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const seats = new Counter<Party>();
        const remainders = new Map<Party, number>();
        const sumVotes = votes.total;

        for (const [party, scores] of votes) {
            const [i, r] = divmod(scores * nSeats, sumVotes);
            seats.set(party, i);
            remainders.set(party, r);
        }

        seats.update([...remainders.keys()]
            .sort((a, b) => remainders.get(b)! - remainders.get(a)!)
            .slice(0, nSeats - seats.total));
        return seats;
    };
    attrib.nSeats = nSeats;
    return attrib;
}
export const largestRemaindersProportional = hare;
export const hamilton = hare;

export function huntingtonHill<Party>(
    { nSeats, threshold, contingency = null }: {
        nSeats: number,
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const divisorFunction = (k: number) => Math.sqrt(k * (k + 1));
    const baseRankIndexFunction = rankIndexFunctionFromDivisorFunction(divisorFunction);
    const rankIndexFunction = (t: number, a: number) => {
        if (a <= 0) {
            return Infinity;
        }
        return baseRankIndexFunction(t, a);
    };

    return proportionalFromRankIndexFunction({
        nSeats,
        rankIndexFunction,
    });

    // const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
    //     const originalVotes = votes;
    //     const thresholdVotes = threshold * votes.total;
    //     votes = new Counter<Party>([...votes.entries()].filter(([_, score]) => score >= thresholdVotes));

    //     if (votes.size === 0) {
    //         if (contingency === null) {
    //             throw new AttributionFailure("No party reached the threshold");
    //         }
    //         return contingency(originalVotes, rest);
    //     }
    //     return proportionalFromDivisorFunction<Party>({
    //         nSeats,
    //         divisorFunction,
    //     })(votes, rest);
    // }
}


// Random-based attribution method

export function randomize<Party>({ nSeats }: { nSeats: number }): Attribution<Party, Simple<Party>> & HasNSeats;
export function randomize<Party>({ nSeats, randomObj }: { nSeats: number, randomObj: RNG }): Attribution<Party, Simple<Party>> & HasNSeats;
export function randomize<Party>({ nSeats, randomSeed }: { nSeats: number, randomSeed: number | string }): Attribution<Party, Simple<Party>> & HasNSeats;
export function randomize<Party>(
    { nSeats, randomObj, randomSeed }: {
        nSeats: number,
        randomObj?: RNG,
        randomSeed?: number | string,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    if (randomObj === undefined) {
        randomObj = new RNG(randomSeed);
    }

    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        return new Counter(randomObj.choices([...votes.keys()], { weights: [...votes.values()], k: nSeats }));
    };
    attrib.nSeats = nSeats;
    return attrib;
}
