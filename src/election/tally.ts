import { ReadonlyCounter } from "@gouvernathor/python/collections";

/**
 * A counter, mapping each party to its number of ballots.
 *
 * [[PS, 5], [LR: 7]] -> 5 ballots for PS, 7 for LR.
 */
export interface Simple<Party> extends ReadonlyCounter<Party, number> { }

/**
 * A list of ballots, each ballot ordering parties by decreasing preference.
 *
 * [[LR, PS, LFI], [LFI, PS,], ] -> one voter prefers LR then PS then LFI,
 * another prefers LFI then PS and didn't rank LR.
 *
 * Math.max(result.map(ballot => ballot.length)) <= number of candidates-1
 *                                               == if the voting method requires a full ranking
 *
 * There can be no tie between candidates within a ballot.
 * Note that not ranking all the candidates is permitted by this type,
 * although some attribution methods may not support it.
 */
export interface Order<Party> extends ReadonlyArray<ReadonlyArray<Party>> { }

/**
 * A mapping from each party to a list of number of ballots, one for each grade.
 *
 * [[PS, [0, 2, 5, 9, 1]], ] -> PS received the worst grade 0 times, the best grade 1 time and so on.
 *
 * result.get(p).length is constant, equal to the number of grades of the voting method.
 *
 * If the voter must grade all the candidates, then sum(result.get(p)) is constant
 * and equal to the number of voters.
 *
 * Any party not mapped will be assumed to have
 * an array of zeros (of length ngrades).
 */
export interface Scores<Party> extends ReadonlyMap<Party, ReadonlyArray<number>> {
    readonly ngrades: number;
    get(key: Party): ReadonlyArray<number>;
}

export namespace Scores {
    function get<Party>(this: Scores<Party>, key: Party): ReadonlyArray<number> {
        const value = this.get(key);
        if (value === undefined) {
            return Array(this.ngrades).fill(0);
        }
        return value!;
    }

    export function fromEntries<Party>(
        elements: readonly [Party, readonly number[]][],
    ): Scores<Party> {
        if (elements.length === 0) {
            throw new Error("Use the fromGrades method to create an empty Scores instance");
        }
        const ths = new Map(elements) as Partial<Scores<Party>> & { ngrades?: number };
        ths.ngrades = elements[0]![1].length;
        ths.get = get.bind(ths as any);
        return ths as Scores<Party>;
    }

    export function fromGrades<Party>(ngrades: number): Scores<Party> {
        const ths = new Map() as Partial<Scores<Party>> & { ngrades?: number };
        ths.ngrades = ngrades;
        ths.get = get.bind(ths as any);
        return ths as Scores<Party>;
    }
}
