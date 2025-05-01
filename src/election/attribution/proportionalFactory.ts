import { divmod } from "@gouvernathor/python";
import { Counter } from "@gouvernathor/python/collections";
import { type Simple } from "../ballots";
import { type Attribution, type HasNSeats } from "../attribution";
import { addThresholdToSimpleAttribution } from "../attribution/transform";
import { type DivisorFunction, type DivisorMethod, type Proportional, proportionalFromDivisorFunction, proportionalFromRankIndexFunction, rankIndexFunctionFromDivisorFunction, type RankIndexMethod, stationaryDivisorFunction } from "./proportionalBase";

const divisor1 = stationaryDivisorFunction(1);
export function jefferson<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: divisor1,
    });
}
export const dHondt = jefferson;

const divisorPoint5: DivisorFunction = k => 2 * k + 1; // int math is better than k + .5
export function webster<Party>(
    { nSeats }: {
        nSeats: number,
    }
): DivisorMethod<Party> & HasNSeats {
    return proportionalFromDivisorFunction<Party>({
        nSeats,
        divisorFunction: divisorPoint5,
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

const huntingtonHillBaseRankIndexFunction = rankIndexFunctionFromDivisorFunction(k => Math.sqrt(k * (k + 1)));
const huntingtonHillRankIndexFunction = (t: number, a: number) => {
    if (a <= 0) {
        return Infinity;
    }
    return huntingtonHillBaseRankIndexFunction(t, a);
};
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
    const attrib = addThresholdToSimpleAttribution({
        threshold,
        contingency,
        attribution: proportionalFromRankIndexFunction({
            nSeats,
            rankIndexFunction: huntingtonHillRankIndexFunction,
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
export const highestAverages = webster;

/**
 * Creates a largest-remainders proportional attribution method.
 *
 * Implementation detail: the quota used is the Hare/Hamilton quota.
 */
export const largestRemainders = hamilton;
