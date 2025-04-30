import { Counter } from "@gouvernathor/python/collections";
import { Simple } from "../ballots";
import { Attribution, HasNSeats } from "../attribution";

/**
 * An attribution method that allocates seats proportionally
 * to the number of votes received by each party.
 */
export interface Proportional<Party> extends Attribution<Party, Simple<Party>> {};

// TODO: doesn't it always implement HasNSeats ?
/**
 * An specific kind of proportional attribution method,
 * based on a rank-index function, and which
 */
export interface RankIndexMethod<Party> extends Proportional<Party> {};

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
): RankIndexMethod<Party> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const allVotes = votes.total;
        const fractions = new Map([...votes.entries()].map(([party, v]) => [party, v / allVotes]));

        const rankIndexValues = new Map([...fractions.entries()].map(([party, f]) => [party, rankIndexFunction(f, 0)]));

        // the parties, sorted by increasing rankIndex value
        const parties = [...votes.keys()].sort((a, b) => rankIndexValues.get(a)! - rankIndexValues.get(b)!);

        const seats = new Counter<Party>();

        s: for (let sn = 0; sn < nSeats; sn++) {
            // take the most deserving party
            const winner = parties.pop()!;
            // give it a seat
            seats.increment(winner);
            // update the rankIndex value of the party
            rankIndexValues.set(winner, rankIndexFunction(fractions.get(winner)!, seats.get(winner)!));

            // insert it in its (new) place in the sorted list of parties
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

export interface DivisorMethod<Party> extends RankIndexMethod<Party> {};

/**
 * A function that should be pure.
 * @param k The number of seats already allocated to a party
 * @returns A value that should be increasing as k rises
 */
export interface DivisorFunction {
    (k: number): number;
};

export function rankIndexFunctionFromDivisorFunction(
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
): DivisorMethod<Party> & HasNSeats {
    return proportionalFromRankIndexFunction({
        nSeats,
        rankIndexFunction: rankIndexFunctionFromDivisorFunction(divisorFunction),
    });
}
