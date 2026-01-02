import { describe, expect, it } from "vitest";
import { createRandomObj } from "../src/utils";
import RNG from "@gouvernathor/rng";

describe("createRandomObj", () => {
    it("returns the same RNG object that was passed, if passed one", () => {
        const rng = new RNG;

        expect(createRandomObj({ randomObj: rng })).toBe(rng);
    });

    it("returns equivalent RNG objects when given the same seed", () => {
        // setup expected values
        const rng = new RNG;
        const seed = rng.random();
        rng.seed = seed;
        const value1 = rng.random();
        const value2 = rng.random();

        const generatedRNG = createRandomObj({ randomSeed: seed });
        expect(generatedRNG.random()).toBe(value1);
        expect(generatedRNG.random()).toBe(value2);
    });

    it("returns new objects every time, when passed nothing or empty options", () => {
        const rng1 = createRandomObj();
        const rng2 = createRandomObj();
        const rng3 = createRandomObj({});
        const rng4 = createRandomObj({});

        expect(rng1).not.toBe(rng2);
        expect(rng1).not.toBe(rng3);
        expect(rng1).not.toBe(rng4);
        expect(rng2).not.toBe(rng3);
        expect(rng2).not.toBe(rng4);
        expect(rng3).not.toBe(rng4);

        expect(rng1.random()).not.toBe(rng2.random());
        expect(rng1.random()).not.toBe(rng3.random());
        expect(rng1.random()).not.toBe(rng4.random());
        expect(rng2.random()).not.toBe(rng3.random());
        expect(rng2.random()).not.toBe(rng4.random());
        expect(rng3.random()).not.toBe(rng4.random());
    });
});
