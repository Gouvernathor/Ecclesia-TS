import { Counter } from "@gouvernathor/python/collections";
import { Attribution, HasNSeats } from "../attribution";
import { addThresholdToSimpleAttribution } from "../attribution/transform";
import { DivisorMethod, Proportional, proportionalFromDivisorFunction, proportionalFromRankIndexFunction, rankIndexFunctionFromDivisorFunction, RankIndexMethod } from "./proportionalBase";
import { Simple } from "../ballots";
import { divmod } from "@gouvernathor/python";

export function jefferson<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: k => k + 1,
    });
}
export const dHondt = jefferson;

export function webster<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: k => 2 * k + 1, // int math is better than k + .5
    });
}
export const sainteLague = webster;

export function hamilton<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Proportional<Party> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const seats = new Counter<Party>();
        const remainders = new Map<Party, number>();
        const sumVotes = votes.total;

        for (const [party, scores] of votes) {
            const [i, r] = divmod(scores * nSeats, sumVotes);
            seats.set(party, i);
            remainders.set(party, r);
        }

        seats.update([...remainders.keys()]
            .sort((a, b) => remainders.get(b)! - remainders.get(a)!)
            .slice(0, nSeats - seats.total));
        return seats;
    };
    attrib.nSeats = nSeats;
    return attrib;
}
export const hareLargestRemainders = hamilton;

/**
 * This attribution method required some creativity and tweaks,
 * since the standard divisor won't work without an initial seats value,
 * causing a division by 0.
 * As a result, a threshold is required in this case.
 *
 * In a situation where the candidates are already limited by other means,
 * (for instance when distributing representatives between a fixed number of states)
 * to be less or equal to the number of seats, then a threhold of 0 can be passed.
 * In that case, the method will allocate one seat to each candidate
 * until all candidates have a seat,
 * or (but that would be a bug) all seats are allocated.
 *
 * The order in which the first seats are allocated is an implementation detail.
 */
export function huntingtonHill<Party>(
    { nSeats, threshold }: {
        nSeats: number,
        threshold: 0,
    }
): DivisorMethod<Party> & HasNSeats;
export function huntingtonHill<Party>(
    { nSeats, threshold, contingency }: {
        nSeats: number,
        threshold: number,
        contingency?: DivisorMethod<Party> | null,
    }
): DivisorMethod<Party> & HasNSeats;
export function huntingtonHill<Party>(
    { nSeats, threshold, contingency }: {
        nSeats: number,
        threshold: number,
        contingency?: RankIndexMethod<Party> | null,
    }
): RankIndexMethod<Party> & HasNSeats;
export function huntingtonHill<Party>(
    { nSeats, threshold, contingency }: {
        nSeats: number,
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> & HasNSeats;
export function huntingtonHill<Party>(
    { nSeats, threshold, contingency = null }: {
        nSeats: number,
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
) {
    const divisorFunction = (k: number) => Math.sqrt(k * (k + 1));
    const baseRankIndexFunction = rankIndexFunctionFromDivisorFunction(divisorFunction);
    const rankIndexFunction = (t: number, a: number) => {
        if (a <= 0) {
            return Infinity;
        }
        return baseRankIndexFunction(t, a);
    };

    const attrib = addThresholdToSimpleAttribution({
        threshold,
        contingency,
        attribution: proportionalFromRankIndexFunction({
            nSeats,
            rankIndexFunction,
        }),
    }) as Attribution<Party, Simple<Party>> & { nSeats?: number };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates a highest-averages proportional attribution method.
 *
 * The exact method used is an implementation detail and may change between versions.
 */
export function highestAverages<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return webster({ nSeats });
}

/**
 * Creates a largest-remainders proportional attribution method.
 *
 * Implementation detail: the quota used is the Hare/Hamilton quota.
 */
export function largestRemainders<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return hamilton({ nSeats });
}
