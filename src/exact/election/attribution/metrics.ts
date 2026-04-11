import { ReadonlyCounter } from "@gouvernathor/python/collections";
import { Fraction } from "@gouvernathor/fraction.ts";
import { FRAC0 } from "../../_util";
import { Simple } from "../tally";

export interface DisproportionMetric<Candidate> {
    (p0: {votes: Simple<Candidate>, seats: ReadonlyCounter<Candidate, number>}): Fraction;
}

/**
 * Returns the mean value (across all candidates) of the absolute difference
 * between the theoretical, (f)ra(c)tional number of seats and the allocated number of seats.
 * The bigger, the less proportional.
 *
 * Compared to a sum or mean of absolute differences of percentage,
 * this
 */
export function defaultMetric<Candidate>(
    { votes, seats }: {
        votes: Simple<Candidate>,
        seats: ReadonlyCounter<Candidate, number>,
    }
): Fraction {
    const allVotes = votes.total;
    const allSeats = BigInt(seats.total);
    let suum = FRAC0;
    for (const party of seats.keys()) {
        const partyVotes = votes.get(party)!;
        const partySeats = seats.get(party)!;
        suum = suum.add(Fraction.fromPair(allSeats * partyVotes, allVotes).sub(partySeats));
    }
    return suum.div(seats.size).asIrreducible();
}
