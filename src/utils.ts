import RNG from "@gouvernathor/rng";

export type RandomObjParam = {randomObj: RNG} | {randomSeed?: number|string};

export function createRandomObj(param?: RandomObjParam): RNG;
export function createRandomObj({ randomObj, randomSeed }:
    { randomObj?: RNG, randomSeed?: number | string } = {},
): RNG {
    if (randomObj === undefined) {
        randomObj = new RNG(randomSeed);
    }
    return randomObj;
}


// https://stackoverflow.com/a/71700658

/**
 * Mutable tuple of a single element type and a given length.
 *
 * Warning: due to limitations in TypeScript, when N is unknown/generic,
 * the typing system does not recognize that the type extends array.
 * Using methods such as map will require a (double) cast first to any then to T[].
 */
export type Tuple<
  T,
  N extends number,
  R extends T[] = [],
> = R['length'] extends N ? R : Tuple<T, N, [T, ...R]>;

/**
 * Immutable version of Tuple.
 *
 * Warning: due to limitations in TypeScript, when N is unknown/generic,
 * the typing system does not recognize that the type extends readonly array.
 * Using methods such as map will require a (double) cast first to any then to readonly T[].
 */
export type ReadonlyTuple<T, N extends number> = Readonly<Tuple<T, N>>;
