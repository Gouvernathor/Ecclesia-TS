import { HasOpinions } from "../../base/actors";
import { Attribution } from "../../base/election/attribution";
import { Order, Simple } from "../../base/election/ballots";
import { enumerate, max, min } from "../../utils/python";
import { Counter } from "../../utils/python/collections";

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
                        first_places.set(party, first_places.get(party) + 1);
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
                scores.set(party, scores.get(party) + i);
            }
        }
        return new Counter([[max(scores.keys(), p => scores.get(p)!), this.nseats]]);
    }
}
