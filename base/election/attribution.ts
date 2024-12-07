import { Counter } from "../../utils/python/collections";
import { HasOpinions } from "../actors";
import { Ballots, Simple } from "./ballots";

/**
 * Thrown when an attribution fails to attribute seats.
 * This is only in the case where it's an expected limitation of the attribution
 * method, the typical example being the Condorcet standoff, or a majority
 * threshold, but a tie could be another example (though they are usually
 * not checked in provided implementations).
 * Other errors may and will be raised by the attribution methods for other
 * reasons, such as invalid input data, division by zero...
 */
export class AttributionFailure extends Error { }

/**
 * Manages how the results from the ballots determine the allocation of seats.
 */
export interface Attribution<Party extends HasOpinions, B extends Ballots<Party>> {
    /**
     * The nseats attribute should generally be set in the constructor and be fixed.
     * However, some attributions may yield variable numbers of seats, for instance
     * the federal German system.
     */
    nseats?: number;

    /**
     * Returns the attribution of seats to the parties based upon the votes.
     * The return value is a counter mapping each party to the number of seats
     * it won. The return value's total() should be equal to the instance's nseats
     * attributes.
     *
     * If the attribution method is expected, by design, to fail under expected
     * conditions, such as a majority threshold not being reached, this method
     * should raise an AttributionFailure error.
     *
     * The second parameter may be used to pass additional data to specific subclasses.
     */
    attrib(votes: B, rest?: {[s: string]: any}): Counter<Party>;
}

/**
 * Abstract base class for proportional attributions,
 * with an optional electoral threshold and contingency attribution.
 */
export abstract class Proportional<Party extends HasOpinions> implements Attribution<Party, Simple<Party>> {
    threshold: number
    contingency: Attribution<Party, Simple<Party>>|null;

    /**
     * The threshold optional parameter takes a value between 0 and 1 (defaulting to 0)
     * which disqualifies the candidates that didn't reach that proportion of the total
     * number of votes. The related filtering will be applied automatically to the votes
     * passed to the attrib method, before passed them to the proportionalAttrib method.
     * A proportional attribution class seeking to implement thresholds differently
     * should either pass 0 to this class' constructor, or not subclass it.
     *
     * The contingency optional parameter provides the fallback in case the threshold
     * is not reached by any candidate. It takes an Attribution instance, or undefined,
     * or null. Null in this case has the specific behavior that if no candidate reaches
     * the threshold, an AttributionFailure error will be raised. If undefined
     * (or not passed), the contingency will default to running the same attribution
     * without the threshold.
     */
    constructor({ threshold=0, contingency }:
        {threshold?: number, contingency?: Attribution<Party, Simple<Party>>|null } = {},
    ) {
        this.threshold = threshold;
        if (contingency === undefined) {
            contingency = {
                attrib: (votes: Simple<Party>, rest) => {
                    this.threshold = 0;
                    try {
                        return this.attrib(votes, rest);
                    } finally {
                        this.threshold = threshold;
                    }
                }
            };
        }
        this.contingency = contingency;
    }

    attrib(votes: Simple<Party>, rest={}): Counter<Party> {
        if (this.threshold > 0) {
            const original_votes = votes;
            const votes_threshold = this.threshold * votes.total;
            votes = new Simple<Party>([...votes.entries()].filter(([_, v]) => v >= votes_threshold));
            if (votes.size === 0) {
                if (this.contingency === null) {
                    throw new AttributionFailure("No party reached the threshold");
                }
                return this.contingency.attrib(original_votes, rest);
            }
        }
        return this.proportionalAttrib(votes, rest);
    }

    /**
     * Subclasses should implement the proportional attribution in this method.
     * The votes are guaranteed to be above the threshold, if any.
     * The method will not be called at all if no party reached the threshold.
     */
    abstract proportionalAttrib: typeof Proportional.prototype.attrib;
}

/**
 * Abstract base class for rank-index methods - a family of proportional attribution methods.
 * It requires a number of seats to be provided.
 */
export abstract class RankIndexMethod<Party extends HasOpinions> extends Proportional<Party> {
    abstract nseats: number;

    /**
     * The function should be pure : it should not take into account any value
     * other than the two parameters and instance or class attributes.
     * @param t the proportion of votes received by a party
     * @param a the number of seats already allocated to that party
     * @returns a value that should be increasing as t rises, and decreasing as a rises.
     * The higher the return value, the higher the chance
     * for the party to receive another seat.
     */
    abstract rankIndexFunction(t: number, a: number): number;

    /**
     * This implementation is optimized so as to call rankIndexFunction as
     * few times as possible.
     */
    attrib(votes: Simple<Party>, rest={}): Counter<Party> {
        const allvotes = votes.total;
        const fractions = new Map([...votes.entries()].map(([p, v]) => [p, v / allvotes]));

        const rankIndexValues = new Map<Party, number>([...fractions.entries()].map(([p, f]) => [p, this.rankIndexFunction(f, 0)]));

        const parties = [...votes.keys()].sort((a, b) => rankIndexValues.get(a)! - rankIndexValues.get(b)!);

        const seats = new Counter<Party>();

        s: for (let _s = 0; _s < this.nseats; _s++) {
            const winner = parties.pop()!;
            seats.increment(winner);
            rankIndexValues.set(winner, this.rankIndexFunction(fractions.get(winner)!, seats.get(winner)!));
            for (let i = 0; i < parties.length; i++) {
                if (rankIndexValues.get(parties[i])! >= rankIndexValues.get(winner)!) {
                    parties.splice(i, 0, winner);
                    continue s;
                }
            }
            parties.push(winner);
        }

        return seats;
    }
}

/**
 * Abstract base class for divisor methods - one kind of rank-index attribution.
 */
export abstract class DivisorMethod<Party extends HasOpinions> extends RankIndexMethod<Party> {
    /**
     * The method should be pure.
     * @param k the number of seats already allocated to a party
     * @returns a value that should be increasing as k rises
     */
    abstract divisor(k: number): number;

    rankIndexFunction(t: number, a: number): number {
        return t / this.divisor(a);
    }
}
