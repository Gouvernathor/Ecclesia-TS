import { range, sum } from "@gouvernathor/python";
import * as math from "@gouvernathor/python/math";
import { createRandomObj, type RandomObjParam, type ReadonlyTuple, type Tuple } from "../utils";

/**
 * Converts a normal distribution to an uniform distribution.
 *
 * (This function is on its own so that the code can be checked by stats people.)
 *
 * @param x generated from a normal distribution
 * @param mu mean value of the normal distribution
 * @param sigma standard deviation of the normal distribution
 * @returns a value following an uniform distribution between 0 and 1,
 * such that the higher the value of x, the higher the return value.
 */
function normalToUniform(x: number, mu: number, sigma: number): number {
    return 0.5 * (1 + math.erf((x - mu) / (sigma * Math.SQRT2)));
}

/**
 * A set of opinions represented as a multi-dimensional vector of integers,
 * with each dimension (each vector member) representing one subject on which
 * an opinion is held.
 * The value in each dimension can be symmetrically positive or negative.
 * Values close to 0 represent neutrality or indecision.
 * The type parameter should be a number giving the number of opinions,
 * of elements in the array.
 * The range of values in the array is from -opinMax to +opinMax,
 * inclusive, as provided to the OpinionsArrayManager object.
 */
export type OpinionsArray<N extends number> = Tuple<number, N>;

/**
 * Returns a one-dimensional alignment of the opinions.
 *
 * @param opinions array of opinions
 * @returns a value such that if each opinion, in each member of a pool
 * of Opinionated instances, is generated randomly following an integer uniform distribution,
 * the return value of this function follows a uniform distribution.
 * With the default factors, the return value is between 0 and 1,
 * and is increasing with each separate opinion,
 * with opinions having a decreasing importance as the array goes.
 */
export interface Aligner<N extends number> {
    (opinions: Readonly<OpinionsArray<N>>): number;
}

/**
 * @param opinMax maximum possible opinion value
 * @param factors ponderation for each opinion's importance in the alignment
 * @returns an aligner function to turns the opinions array
 * into a one-dimensional alignment value.
 */
function getAligner<N extends number>(
    opinMax: number,
    factors: readonly number[], // not Tuple because annoying to cast and internal function
): Aligner<N> {
    const rang = range(-opinMax, opinMax+1);
    // standard deviation of one opinion taken on its own
    const oneSigma = Math.sqrt(sum(rang.map(i => i ** 2)) / rang.length);
    // using Lyapunov's central limit theorem
    const sigma = math.hypot(...factors.map(f => f * oneSigma));

    return (opinions) => {
        const scapro = sum((<number[]><any>opinions).map((opinion, i) => opinion * factors[i]!));
        return normalToUniform(scapro, 0, sigma);
    };
}

/**
 * @returns factors such that the return value of the aligner function
 * is between 0 and 1, and is increasing with each separate opinion,
 * with opinions having a decreasing importance.
 */
function getDefaultAlignmentFactors<N extends number>(nOpinions: N) {
    return Array.from({length: nOpinions}, (_, i) => 1 - i / nOpinions) as Tuple<N, number>;
}

/**
 * This holds the parameters for the opinions arrays : their length,
 * their range of values, and how to align them to one dimension.
 *
 * It can be seen as a metaclass for the opinions arrays, except that
 * they are real arrays instead of a custom type, so this is a normal class.
 *
 * There should generally be only one instance of this class per system,
 * and all opinions arrays should share the same parameters -
 * at least the same length and value range - even for opinions of different kinds,
 * for instance parties, citizens, and bills.
 * In any case, disagreement should not pe supported between subclasses
 * of different nOpinions or opinMax values.
 *
 * Other than being a repository for the meta parameters,
 * this class provides :
 * - a balanced single-dimensional alignment for all opinions arrays
 * - a random generator for the opinions arrays
 */
export class OpinionsArrayManager<N extends number> {
    /**
     * The number of opinions in each array, equal to the type parameter,
     * provided for runtime access.
     */
    readonly nOpinions: N;
    /**
     * The maximum possible value of each opinion in the array.
     */
    readonly opinMax: number;
    readonly opinionAlignmentFactors: ReadonlyTuple<N, number>;

    /**
     * This function takes an opinions array and returns a single value
     * representing the alignment of this set of opinions in a single axis.
     * If using the default opinion alignment factors, the alignment is between 0 and 1.
     */
    readonly aligner: Aligner<N>;
    /**
     * A random generator for the opinions arrays.
     * You can pass a random object generator, or a seed that will be used
     * to initialize a random object.
     *
     * Each opinion value in the array will be generated following a uniform law.
     */
    readonly generator: (p?: RandomObjParam) => OpinionsArray<N>;

    constructor({
        nOpinions, opinMax,
        opinionAlignmentFactors = getDefaultAlignmentFactors(nOpinions)
    }: {
        nOpinions: N, opinMax: number,
        opinionAlignmentFactors?: ReadonlyTuple<N, number>,
    }) {
        this.nOpinions = nOpinions;
        this.opinMax = opinMax;
        this.opinionAlignmentFactors = opinionAlignmentFactors;

        this.aligner = getAligner<N>(opinMax, opinionAlignmentFactors);
        this.generator = (randomParam?: RandomObjParam) =>
            createRandomObj(randomParam)
                .choices(range(-opinMax, opinMax+1), { k: nOpinions }) as OpinionsArray<N>;
    }
}
