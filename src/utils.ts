import RNG from "@gouvernathor/rng";

export function createRandomObj({}?): RNG;
export function createRandomObj({ randomObj }: { randomObj: RNG }): RNG;
export function createRandomObj({ randomSeed }: { randomSeed: number | string }): RNG;
export function createRandomObj({ randomObj, randomSeed }:
    { randomObj?: RNG, randomSeed?: number | string } = {},
): RNG {
    if (randomObj === undefined) {
        randomObj = new RNG(randomSeed);
    }
    return randomObj;
}
