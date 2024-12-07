import { HasOpinions } from "../../base/actors";
import { Attribution, AttributionFailure, DivisorMethod, Proportional } from "../../base/election/attribution";
import { Order, Scores, Simple } from "../../base/election/ballots";
import { divmod, enumerate, max, min } from "../../utils/python";
import { Counter, DefaultMap } from "../../utils/python/collections";
import { fmean, median } from "../../utils/python/statistics";
import RNG from "../../utils/RNG";

// Majority methods

abstract class Majority<Party extends HasOpinions> implements Attribution<Party, Simple<Party>> {
    nseats: number;
    abstract threshold: number;
    abstract contingency: Attribution<Party, Simple<Party>>|null;

    constructor({nseats}: {nseats: number}) {
        this.nseats = nseats;
    }

    attrib(votes: Simple<Party>, rest = {}): Counter<Party> {
        const win = max(votes.keys(), p => votes.get(p)!);
        if ((votes.get(win)! / votes.total) > this.threshold) {
            return new Counter([[win, this.nseats]]);
        }
        if (this.contingency === null) {
            throw new AttributionFailure("No majority winner");
        }
        return this.contingency.attrib(votes, rest);
    }
}

/**
 * Attribution method where the party with the most votes wins all the seats.
 * No threshold.
 */
export class Plurality<Party extends HasOpinions> extends Majority<Party> {
    threshold = 0;
    contingency = null;
}

/**
 * Attribution method where you need to reach a certain percentage of the votes
 * to win all the seats.
 *
 * If no party reaches the threshold and no contingency is provided,
 * an AttributionFailure is thrown.
 */
export class SuperMajority<Party extends HasOpinions> extends Majority<Party> {
    threshold: number;
    contingency: Attribution<Party, Simple<Party>>|null;
    constructor({nseats, threshold, contingency = null}:
        {nseats: number, threshold: number, contingency: Attribution<Party, Simple<Party>>|null},
    ) {
        super({nseats});
        this.threshold = threshold;
        this.contingency = contingency;
    }
}


// Ordering-based methods

/**
 * Attribution method where the party with the least votes is eliminated,
 * and its votes are redistributed to the other parties according to the voters'
 * preferences. Repeats until a party reaches a majority of the remaining votes,
 * winning all the seats.
 *
 * Ballots not ranking all candidates are supported.
 */
export class InstantRunoff<Party extends HasOpinions> implements Attribution<Party, Order<Party>> {
    nseats: number;
    constructor({ nseats }: { nseats: number }) {
        this.nseats = nseats;
    }

    attrib(votes: Order<Party>, rest = {}): Counter<Party> {
        const blacklisted = new Set<Party>();

        const nparties = new Set([].flat()).size;
        for (let _i = 0; _i < nparties; _i++) {
            const first_places = new Counter<Party>();
            for (const ballot of votes) {
                for (const party of ballot) {
                    if (!blacklisted.has(party)) {
                        first_places.increment(party);
                        break;
                    }
                }
            }

            const total = first_places.total;
            for (const [party, score] of first_places) {
                if (score / total > 0.5) {
                    return new Counter([[party, this.nseats]]);
                }
            }
            blacklisted.add(min(first_places.keys(), p => first_places.get(p)!));
        }
        throw new Error("Should not happen");
    }
}

/**
 * Attribution method where each party receives points according to the position
 * it occupies on each ballot, and the party with the most points wins all the seats.
 *
 * Uses the Modified Borda Count, where the least-ranked candidate gets 1 point,
 * and unranked candidates get 0 points.
 * So, ballots not ranking all candidates are supported.
 */
export class Borda<Party extends HasOpinions> implements Attribution<Party, Order<Party>> {
    nseats: number;
    constructor({ nseats }: { nseats: number }) {
        this.nseats = nseats;
    }

    attrib(votes: Order<Party>, rest = {}): Counter<Party> {
        const scores = new Counter<Party>();
        for (const ballot of votes) {
            for (const [i, party] of enumerate(ballot.slice().reverse(), 1)) {
                scores.increment(party, i);
            }
        }
        return new Counter([[max(scores.keys(), p => scores.get(p)!), this.nseats]]);
    }
}

/**
 * Attribution method where each party is matched against each other party,
 * and the party winning each of its matches wins all the seats.
 * If no party wins against all others, the attribution fails.
 *
 * Doesn't support candidates with equal ranks, because the Order format doesn't allow it.
 * This implementation also doesn't support incomplete ballots.
 *
 * The constructor takes an optional contingency method to use in case of a tie.
 * If none is provided, a Condorcet.Standoff exception is raised
 * (itself a subclass of AttributionFailure).
 */
export class Condorcet<Party extends HasOpinions> implements Attribution<Party, Order<Party>> {
    nseats: number;
    contingency: Attribution<Party, Order<Party>>|null;
    constructor({ nseats, contingency = null }: { nseats: number, contingency: Attribution<Party, Order<Party>>|null }) {
        this.nseats = nseats;
        this.contingency = contingency;
    }

    static Standoff = class Standoff extends AttributionFailure {}

    attrib(votes: Order<Party>, rest = {}): Counter<Party> {
        const counts = new DefaultMap<Party, Counter<Party>>(() => new Counter());
        const majority = votes.length / 2;

        for (const ballot of votes) {
            for (const [i, party1] of enumerate(ballot)) {
                for (const party2 of ballot.slice(i+1)) {
                    counts.get(party1).increment(party2);
                }
            }
        }

        const win = new Set<Party>(counts.keys());
        for (const [party, partycounter] of counts) {
            for (const value of partycounter.pos().values()) {
                if (value < majority) {
                    win.delete(party);
                    break;
                }
            }
        }

        if (win.size === 0) {
            if (this.contingency === null) {
                throw new Condorcet.Standoff("No Condorcet winner");
            }
            return this.contingency.attrib(votes, rest);
        }
        const [winner, ] = win;
        return new Counter([[winner, this.nseats]]);
    }
}


// Score-based methods

/**
 * Gives the seat(s) to the party with the highest average score.
 *
 * Supports tallies where some parties were not graded by everyone.
 */
export class AverageScore<Party extends HasOpinions> implements Attribution<Party, Scores<Party>> {
    nseats: number;
    constructor({ nseats }: { nseats: number }) {
        this.nseats = nseats;
    }

    attrib(votes: Scores<Party>, rest = {}): Counter<Party> {
        // const ngrades = votes.ngrades ?? votes.values().next().value.length;

        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        return new Counter([[max(counts.keys(), party => fmean(counts.get(party)!)), this.nseats]]);
    }
}

/**
 * Gives the seat(s) to the party with the highest median score.
 *
 * If there is a tie, the contingency method is called on the tied parties.
 * The default contingency is to take the maximum average score.
 *
 * Supports tallies where some parties were not graded by everyone.
 */
export class MedianScore<Party extends HasOpinions> implements Attribution<Party, Scores<Party>> {
    nseats: number;
    contingency: Attribution<Party, Scores<Party>>;
    constructor({nseats, contingency}: {nseats: number, contingency?: Attribution<Party, Scores<Party>>}) {
        this.nseats = nseats;
        if (contingency === undefined) {
            contingency = new AverageScore({nseats});
        }
        this.contingency = contingency;
    }

    attrib(votes: Scores<Party>, rest = {}): Counter<Party> {
        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        const medians = new Map<Party, number>([...counts.entries()].map(([parti, partigrades]) => [parti, median(partigrades)]));

        const winscore = Math.max(...medians.values());
        const [winner, ...winners] = [...medians.keys()].filter(party => medians.get(party) === winscore);

        if (winners.length === 0) { // no tie
            return new Counter([[winner, this.nseats]]);
        }

        winners.unshift(winner);
        const trimmedResults = new Scores<Party>(winners.map(party => [party, votes.get(party)!]));
        return this.contingency.attrib(trimmedResults, rest);
    }
}


// Proportional methods

export class DHondt<Party extends HasOpinions> extends DivisorMethod<Party> {
    nseats: number;
    constructor({ nseats, ...rest }: { nseats: number }) {
        super(rest);
        this.nseats = nseats;
    }

    divisor(k: number): number {
        return k + 1;
    }
}

export const HighestAverages = DHondt;

export class Webster<Party extends HasOpinions> extends DivisorMethod<Party> {
    nseats: number;
    constructor({ nseats, ...rest }: { nseats: number }) {
        super(rest);
        this.nseats = nseats;
    }

    divisor(k: number): number {
        // return k + .5
        return 2 * k + 1; // int math is more accurate
    }
}

export class Hare<Party extends HasOpinions> extends Proportional<Party> {
    nseats: number;
    constructor({ nseats, ...rest }: { nseats: number }) {
        super(rest);
        this.nseats = nseats;
    }

    proportionalAttrib(votes: Simple<Party>, rest: { [s: string]: any; }): Counter<Party> {
        const seats = new Counter<Party>();
        const remainders = new Map<Party, number>();
        const nseats = this.nseats;
        const sumvotes = votes.total;

        for (const [parti, scores] of votes) {
            const [i, r] = divmod(scores * nseats, sumvotes);
            seats.set(parti, i);
            remainders.set(parti, r);
        }

        seats.update([...remainders.keys()].sort((a, b) => remainders.get(b)! - remainders.get(a)!).slice(0, nseats - seats.total));
        return seats;
    }
}

export const LargestRemainders = Hare;

/**
 * This method requires some creativity and tweaks, since the divisor won't work
 * without an initial seats value, causing a division by 0.
 * As a result, the threshold is required in this case.
 * In a situation where the parties are already limited by other means
 * (for example when sharing representatives between US states) to be less or
 * equal to the number of states, a threshold of 0 can be passed.
 */
export class HuntingtonHill<Party extends HasOpinions> extends DivisorMethod<Party> {
    nseats: number;
    constructor({nseats, threshold, contingency = null}:
        {nseats: number, threshold: number, contingency?: Attribution<Party, Simple<Party>>|null},
    ) {
        super({threshold, contingency});
        this.nseats = nseats;
    }

    divisor(k: number): number {
        return Math.sqrt(k * (k + 1));
    }

    override rankIndexFunction(t: number, a: number): number {
        if (a <= 0) {
            return Infinity;
        }
        return super.rankIndexFunction(t, a);
    }

    // override attrib(votes: Simple<Party>, rest = {}): Counter<Party> {
    //     const original_votes = votes;
    //     const threshold = this.threshold*votes.total;
    //     votes = new Simple<Party>([...votes.entries()].filter(([party, score]) => score >= threshold));
    //     if (votes.size === 0) {
    //         if (this.contingency === null) {
    //             throw new AttributionFailure("No party over threshold");
    //         }
    //         return this.contingency.attrib(original_votes, rest);
    //     }
    //     return super.proportionalAttrib(votes, rest);
    // }
}


// Random-based attribution method

/**
 * Randomized attribution.
 * Everyone votes, then one ballot is selected at random.
 * (One ballot per seat to fill, and assuming there's
 * enough ballots that the picking is with replacement.)
 */
export class Randomize<Party extends HasOpinions> implements Attribution<Party, Simple<Party>> {
    nseats: number;
    randomObj: RNG;
    constructor({nseats}: {nseats: number});
    constructor({nseats, randomObj}: {nseats: number, randomObj: RNG});
    constructor({nseats, randomSeed}: {nseats: number, randomSeed: number | string});
    constructor({nseats, randomObj, randomSeed}:
        {nseats: number, randomObj?: RNG, randomSeed?: number | string},
    ) {
        this.nseats = nseats;
        if (randomObj === undefined) {
            randomObj = new RNG(randomSeed);
        }
        this.randomObj = randomObj;
    }

    attrib(votes: Simple<Party>, rest = {}): Counter<Party> {
        return new Counter<Party>(this.randomObj.choices([...votes.keys()], {weights: [...votes.values()], k: this.nseats}));
    }
}
