import { range, sum } from "@gouvernathor/python";
import * as math from "@gouvernathor/python/math";
import { createRandomObj, RandomObjParam } from "./utils";

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
interface Aligner {
    (opinions: readonly number[]): number;
}

/**
 * @param opinMax maximum possible opinion value
 * @param factors ponderation for each opinion's importance in the alignment
 * @returns an aligner function to turns the opinions array
 * into a one-dimensional alignment value.
 */
function getAligner(
    opinMax: number,
    factors: readonly number[],
): Aligner {
    const rang = range(-opinMax, opinMax+1);
    // standard deviation of one opinion taken on its own
    const oneSigma = Math.sqrt(sum(rang.map(i => i ** 2)) / rang.length);
    // using Lyapunov's central limit theorem
    const sigma = math.hypot(...factors.map(f => f * oneSigma));

    return (opinions) => {
        const scapro = sum(opinions.map((opinion, i) => opinion * factors[i]));
        return normalToUniform(scapro, 0, sigma);
    };
}

/**
 * @returns factors such that the return value of the aligner function
 * is between 0 and 1, and is increasing with each separate opinion,
 * with opinions having a decreasing importance.
 */
function getDefaultAlignmentFactors(nOpinions: number) {
    return Array.from({length: nOpinions}, (_, i) => 1 - i / nOpinions);
}
