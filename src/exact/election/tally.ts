import { ReadonlyCounter } from "@gouvernathor/python/collections";

/**
 * A counter, mapping each party to its number of ballots.
 *
 * [[PS, 5], [LR: 7]] -> 5 ballots for PS, 7 for LR.
 */
export interface Simple<Candidate> extends ReadonlyCounter<Candidate, bigint> { }

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
export interface Scores<Candidate> extends ReadonlyMap<Candidate, ReadonlyArray<bigint>> {
    readonly ngrades: number;
    get(key: Candidate): readonly bigint[];
}

class BaseScores<Candidate>
        extends Map<Candidate, ReadonlyArray<bigint>>
        implements Scores<Candidate> {
    ngrades!: number;

    override get(key: Candidate): readonly bigint[] {
        const value = super.get(key);
        if (value === undefined) {
            return Array(this.ngrades).fill(0);
        }
        return value;
    }
}

export namespace Scores {
    export function fromEntries<Candidate>(
        elements: readonly [Candidate, readonly bigint[]][],
    ): Scores<Candidate> {
        if (elements.length === 0) {
            throw new Error("Use the fromGrades method to create an empty Scores instance");
        }
        const ths = new BaseScores(elements);
        ths.ngrades = elements[0]![1].length;
        return ths;
    }

    export function fromGrades<Candidate>(ngrades: number): Scores<Candidate> {
        const ths = new Map() as ReadonlyMap<Candidate, readonly bigint[]> & { ngrades?: number };
        ths.ngrades = ngrades;
        ths.get = () => Array(ngrades).fill(0);
        return ths as Scores<Candidate>;
    }
}
