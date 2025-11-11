import { type ReadonlyCounter } from "@gouvernathor/python/collections";
import { type Simple } from "../ballots";

export interface DisproportionMetric<Party> {
    (p0: {votes: Simple<Party>, seats: ReadonlyCounter<Party, number>}): number;
}

/**
 * Returns the mean value (across all candidates) of the absolute difference
 * between the theoretical, (f)ra(c)tional number of seats and the allocated number of seats.
 * The bigger, the less proportional.
 *
 * Compared to a sum or mean of absolute differences of percentage,
 * this
 */
export function defaultMetric<Party>(
    { votes, seats }: {
        votes: Simple<Party>,
        seats: ReadonlyCounter<Party, number>,
    }
): number {
    const allVotes = votes.total;
    const allSeats = seats.total;
    let suum = 0;
    for (const party of seats.keys()) {
        const partyVotes = votes.get(party)!;
        const partySeats = seats.get(party)!;
        suum += Math.abs(allSeats * partyVotes / allVotes - partySeats);
    }
    return suum / seats.size;
}
