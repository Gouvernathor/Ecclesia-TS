import { HasOpinions } from "../../base/actors";
import { Attribution, AttributionFailure } from "../../base/election/attribution";
import { Order, Scores, Simple } from "../../base/election/ballots";
import { enumerate, max, min } from "../../utils/python";
import { Counter, DefaultMap } from "../../utils/python/collections";
import { fmean } from "../../utils/python/statistics";

// Majority methods

abstract class Majority<Party extends HasOpinions> implements Attribution<Party, Simple<Party>> {
    nseats: number;
    abstract threshold: number;
    abstract contingency: Attribution<Party, Simple<Party>>;

    constructor({nseats}: {nseats: number}) {
        this.nseats = nseats;
    }

    attrib(votes: Simple<Party>, rest = {}): Counter<Party> {
        const win = max(votes.keys(), p => votes.get(p)!);
        if ((votes.get(win)! / votes.total) > this.threshold) {
            return new Counter([[win, this.nseats]]);
        }
        return this.contingency.attrib(votes, rest);
    }
}

export class Plurality<Party extends HasOpinions> extends Majority<Party> {
    threshold = 0;
    contingency = null;
}

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

export class AverageScore<Party extends HasOpinions> implements Attribution<Party, Scores<Party>> {
    nseats: number;
    constructor({ nseats }: { nseats: number }) {
        this.nseats = nseats;
    }

    attrib(votes: Scores<Party>, rest = {}): Counter<Party> {
        const ngrades = votes.ngrades ?? votes.values().next().value.length;

        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        return new Counter([[max(counts.keys(), party => fmean(counts.get(party)!)), this.nseats]]);
    }
}
