import { enumerate, max, min } from "@gouvernathor/python";
import { type Counter, DefaultMap, NumberCounter } from "@gouvernathor/python/collections";
import { Order } from "../tally";
import { type Attribution, AttributionFailure, type HasNSeats } from "../attribution";

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
    const attrib = (votes: Order<Party>, _rest = {}): Counter<Party, number> => {
        const blacklisted = new Set<Party>();

        const nParties = new Set(votes.flat()).size;
        for (let pn = 0; pn < nParties; pn++) {
            const firstPlaces = NumberCounter.fromEntries<Party>();
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
                    return NumberCounter.fromEntries([[party, nSeats]]);
                }
            }
            blacklisted.add(min(firstPlaces.keys(), p => firstPlaces.get(p)));
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
    const attrib = (votes: Order<Party>, _rest = {}): Counter<Party, number> => {
        const scores = NumberCounter.fromEntries<Party>();
        for (const ballot of votes) {
            for (const [i, party] of enumerate(ballot.slice().reverse(), 1)) {
                scores.increment(party, i);
            }
        }
        return NumberCounter.fromEntries([[max(scores.keys(), p => scores.get(p)), nSeats]]);
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
    const attrib = (votes: Order<Party>, rest = {}): Counter<Party, number> => {
        const counts = new DefaultMap<Party, Counter<Party, number>>(() => NumberCounter.fromEntries());
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
        return NumberCounter.fromEntries([[winner!, nSeats]]);
    };
    attrib.nSeats = nSeats;
    return attrib;
}
condorcet.Standoff = class CondorcetStandoff extends AttributionFailure {};
