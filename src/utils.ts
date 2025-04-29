import RNG from "@gouvernathor/rng";

export type RandomObjParam = undefined | {randomObj: RNG} | {randomSeed: number|string};

export function createRandomObj(param: RandomObjParam): RNG;
export function createRandomObj({ randomObj, randomSeed }:
    { randomObj?: RNG, randomSeed?: number | string } = {},
): RNG {
    if (randomObj === undefined) {
        randomObj = new RNG(randomSeed);
    }
    return randomObj;
}
