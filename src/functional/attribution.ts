import { Counter } from "@gouvernathor/python/collections";
import { Ballots, Simple } from "../ballots";

export class AttributionFailure extends Error { }

// in doc, recommend throwing AttributionFailure
export type Attribution<Party, B extends Ballots<Party>> =
    (votes: B, rest?: Record<string, any>) => Counter<Party>;

export type HasNSeats = { readonly nSeats: number };


/*
partial factory methods
(methods that take a function, optionally other stuff, and return an attribution)
 */

/**
 * Stands in for the Proportional class implementation.
 *
 * The votes passed to the proportionalAttrib method are guaranteed to be above the threshold,
 * except that if no party reached the threshold, and the contingency is undefined (which is not the same as null),
 * all votes will be passed.
 */
export function addThresholdToProportional<Party>(
    { threshold = 0, contingency, proportionalAttrib }: {
        threshold?: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
        proportionalAttrib: Attribution<Party, Simple<Party>>,
    }
): Attribution<Party, Simple<Party>> {
    const threshold_ = threshold;
    if (contingency === undefined) {
        contingency = (votes: Simple<Party>, rest) => {
            // FIXME: just call proportionalAttrib directly ?
            threshold = 0;
            try {
                return attrib(votes, rest);
            } finally {
                threshold = threshold_;
            }
        };
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
        return proportionalAttrib(votes, rest);
    }
    return attrib;
}

export function proportionalFromRankIndexFunction<Party>(
    { nSeats, rankIndexFunction }: {
        nSeats: number,
        rankIndexFunction: (t: number, a: number) => number,
    }
): Attribution<Party, Simple<Party>> {
    return (votes: Simple<Party>, rest = {}): Counter<Party> => {
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
    }
}

export function proportionalFromDivisorFunction<Party>(
    { nSeats, divisorFunction }: {
        nSeats: number,
        divisorFunction: (k: number) => number,
    }
): Attribution<Party, Simple<Party>> {
    return proportionalFromRankIndexFunction({
        nSeats,
        rankIndexFunction: (t, a) => t / divisorFunction(a),
    });
}
