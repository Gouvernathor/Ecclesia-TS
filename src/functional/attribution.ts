import { Counter } from "@gouvernathor/python/collections";
import { Ballots, Simple } from "../ballots";

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
 * A function to manage how the results from the ballots translate into an allocation of seats.
 *
 * If the attribution method is expected, by design, to fail under expected conditions,
 * such as a majority threshold not being reached,
 * this method should raise an AttributionFailure error.
 *
 * @param rest This parameter, ignored in most cases,
 * forces the attributions taking more required or optional parameters
 * to take them as an options object.
 *
 * @returns The attribution of seats to the parties based upon the votes.
 * It is a Counter mapping each party to the number of seats it won.
 * The return value's total() should be equal to the nSeats attributes - if any.
 */
export type Attribution<Party, B extends Ballots<Party>> =
    (votes: B, rest?: Record<string, any>) => Counter<Party>;

/**
 * Most attributions should generally implement this interface, and have a fixed number of seats.
 *
 * However, some attributions may yield variable numbers of seats,
 * for instance the pre-2024 federal German system.
 */
export type HasNSeats = { readonly nSeats: number };


/*
partial factory methods
(methods that take a function, optionally other stuff, and return an attribution)
 */

/**
 * Transforms a standard proportional attribution method into one that requires a certain threshold
 * (percentage of the total votes) to be reached by the parties in order to receive seats.
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
 * @param proportionalAttrib The votes passed to this attribution method are guaranteed to be above the threshold,
 * except if the contingency is undefined and no party reached the threshold
 * (in that case, all parties will be passed).
 */
export function addThresholdToProportional<Party>(
    { threshold, contingency, proportionalAttrib }: {
        threshold: number,
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

/**
 * A function that should be pure : it should not take into account
 * any value other than the arguments passed to it.
 *
 * @param t The fraction of votes received by a candidate
 * @param a The number of seats already allocated to that candidate
 * @returns A value that should be increasing as t rises, and decreasing as a rises.
 * The higher the return value, the more likely the candidate is to receive another seat.
 */
export type RankIndexFunction = (t: number, a: number) => number;

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
    }
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * A function that should be pure.
 * @param k The number of seats already allocated to a party
 * @returns A value that should be increasing as k rises
 */
type DivisorFunction = (k: number) => number;

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
        rankIndexFunction: (t, a) => t / divisorFunction(a),
    });
}
