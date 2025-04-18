import { range, sum } from "@gouvernathor/python";
import * as math from "@gouvernathor/python/math";
import RNG from "@gouvernathor/rng";

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
function normalToUniform(x: number, mu: number, sigma: number): number {
    return 0.5 * (1 + math.erf((x - mu) / (sigma * Math.SQRT2)));
}

/**
 * @returns factors such that the return value of the aligner function
 * is between 0 and 1, and is increasing with each separate opinion,
 * with opinions having a decreasing importance.
 */
function getDefaultAlignmentFactors(nopinions: number) {
    return Array.from({length: nopinions}, (_, i) => 1 - i / nopinions);
}

/**
 * @param opinmax maximum possible opinion value
 * @param factors ponderation for each opinion's importance in the alignment
 * @returns a function which turns the opinions array of a HasOpinions instance
 * into a one-dimensional alignment value
 */
function getAligner(
    opinmax: number,
    factors: number[],
): (opinions: number[]) => number {
    const rang = range(-opinmax, opinmax + 1);
    // standard deviation of one opinion taken on its own
    const one_sigma = Math.sqrt(sum(rang.map(i => i ** 2)) / rang.length);
    // using Lyapunov's central limit theorem
    const sigma = math.hypot(...factors.map(f => f * one_sigma));

    /**
     * Returns the one-dimensional alignment of the opinions.
     *
     * @param opinions array of opinions
     * @returns a value such that if each opinion, in each member of
     * a pool of HasOpinion instances, is generated randomly following an integer
     * uniform distribution, the return value follows a uniform distribution.
     * With the default factors, the return value is between 0 and 1, and is increasing
     * with each separate opinion, with opinions having a decreasing importance.
     */
    return function aligner(opinions: number[]) {
        const scapro = sum(opinions.map((opinion, i) => opinion * factors[i]));
        return normalToUniform(scapro, 0, sigma);
    }
}

/**
 * An abstract base class for objects that have or represent opinions on subjects.
 * This typically covers voters, parties, and bills.
 *
 * The nopinions, opinmax, and opinionAlignmentFactors static attributes
 * should be global to a given system, and be set once in an abstract subclass
 * of HasOpinion that will be a base class for all your classes having opinions.
 * In any case, HasOpinions subclasses should definitely not support operations
 * between subclasses with different nopinions or opinmax values.
 *
 * The opinions of someone or something are represented as a multi-dimensional vector
 * of integers, with each dimension representing one subject on which an opinion is held.
 * The value in each dimension can be symmetrically positive or negative.
 * Values close to 0 represent neutrality or indecision. There are nopinions dimensions,
 * and each dimension can take values between -opinmax and opinmax (included).
 */
export abstract class HasOpinions {
    static readonly nopinions: number;
    static readonly opinmax: number;
    // can be overridden with a constant array in subclasses
    static get opinionAlignmentFactors(): number[] {
        return getDefaultAlignmentFactors(this.nopinions);
    }

    opinions: number[];
    private readonly aligner;

    /**
     * If no opinion sequence is provided, the opinions are generated following an
     * integral uniform law for each dimension. The optional randomObj parameter
     * can be used to provide a random number generator (a RNG instance) to generate
     * the opinions, or the optional randomSeed parameter can be used to deterministically
     * seed a new RNG instance.
     */
    constructor({ }?);
    constructor({ opinions }: { opinions: number[] });
    constructor({ randomObj }: { randomObj: RNG });
    constructor({ randomSeed }: { randomSeed: number | string });
    constructor({ opinions, randomObj, randomSeed }:
        { opinions?: number[], randomObj?: RNG, randomSeed?: number | string } = {},
    ) {
        const cls = this.constructor as typeof HasOpinions;
        if (opinions === undefined) {
            if (randomObj === undefined) {
                randomObj = new RNG(randomSeed);
            }
            opinions = randomObj.choices(range(-cls.opinmax, cls.opinmax + 1), { k: cls.nopinions });
        }
        this.opinions = opinions;

        this.aligner = getAligner(cls.opinmax, cls.opinionAlignmentFactors);
    }

    /**
     * The objects having an opinion (typically, voters and parties) can be
     * placed on a single-dimension axis (typically left-wing to right-wing),
     * called the alignment.
     * The opinionAlignmentFactors static property provides a sequence of
     * ponderation factors for each dimension of the opinion vector. If it is
     * not overridden, the default one is generated from the number of opinions
     * by the getDefaultAlignmentFactors function.
     */
    get alignment(): number {
        return this.aligner(this.opinions);
    }

    /**
     * Subclasses of HasOpinions may override this method. It should take
     * instances of a subclass of HasOpinions with the same nopinions and opinmax
     * values, but not necessarily the same class as the "this" object,
     * and return a value proportional to the disagreement between the two objects
     * (the higher the value, the stronger the disagreement).
     *
     * Not all (concrete) subclasses need to support disagreement with all other
     * subclasses in the same system, or even with other instances of the same subclass,
     * but the voting methods rely on disagreement being supported at least between the
     * voter class and the party class.
     *
     * The operation should be symmetric : a.disagree(b) should be the same as b.disagree(a).
     *
     * However, the operation does not need to be symmetric when it comes to types :
     * a given object o of type O can have different disagreement values with objects
     * of types P and Q having the same opinions array.
     * Similarly, a party with opinions o1 and a voter with opinions o2 can have a different
     * disagreement value than a voter with opinions o1 and a party with opinions o2.
     */
    abstract disagree<HO extends HasOpinions>(other: HO): number;
}
