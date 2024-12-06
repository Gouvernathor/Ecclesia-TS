import { erf, hypot, range, sum } from "../pythonUtils";

const SQ2 = Math.sqrt(2);

/**
 * Converts a normal distribution to an uniform distribution.
 *
 * Returns a value following an uniform distribution between 0 and 1n
 * such that the higher the value of x, the higher the return value.
 * (This function is on its own so that the code can be checked by stats people.)
 *
 * @param x generated from a normal distribution
 * @param mu mean value of the normal distribution
 * @param sigma standard deviation of the normal distribution
 */
function normal_to_uniform(x: number, mu: number, sigma: number): number {
    return 0.5 * (1 + erf((x - mu) / (sigma * SQ2)));
}

/**
 * Returns the one-dimensional alignment of the opinions.
 *
 * Assuming the opinions parameter follows the nominal constraints with respect opinmax,
 * the return value is between 0 and 1.
 * The return value is such that if each opinion, in each member of a pool of
 * HasOpinion instances, is generated randomly following an integer uniform distribution,
 * the return value follows a uniform distribution.
 *
 * @param opinions array of opinions
 * @param opinmax maximum possible opinion value
 * @param factors ponderation for each opinion's importance in the alignment
 * @returns
 */
export function get_alignment(
    opinions: number[],
    opinmax: number,
    factors?: number[],
): number {
    const nopinions = opinions.length;
    if (factors === undefined) {
        factors = [];
        for (let i = 0; i < nopinions; i++) {
            factors.push(1-i/nopinions);
        }
    }

    const scapro = sum(opinions.map((opinion, i) => opinion * factors[i]));
    const rang = range(-opinmax, opinmax + 1);
    // standard deviation of one opinion taken on its own
    const one_sigma = Math.sqrt(sum(rang.map(i => i**2)) / rang.length);
    // using Lyapunov's central limit theorem
    const sigma = hypot(...factors.map(f => f * one_sigma));

    return normal_to_uniform(scapro, 0, sigma);
}
