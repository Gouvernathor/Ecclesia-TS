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
 */
export type Tuple<
  T,
  N extends number,
  R extends T[] = [],
> = R['length'] extends N ? R : Tuple<T, N, [T, ...R]>;

/**
 * Immutable version of Tuple.
 */
export type ReadonlyTuple<T, N extends number> = Readonly<Tuple<T, N>>;
