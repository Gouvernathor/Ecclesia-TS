import { describe, expect, it } from "vitest";
import { Scores } from "../../src/election/tally";

describe("Scores.fromEntries", () => {
    it("fails on empty input", () => {
        expect(() => Scores.fromEntries([])).toThrow();
    });

    it("contains the passed values (has & get)", () => {
        const instance = Scores.fromEntries([["c1", [1, 2, 3, 4, 5]], ["c2", [5, 6, 7, 8, 9]]]);

        expect(instance.has("c1")).toBe(true);
        expect(instance.get("c1")[3]).toBe(4);

        expect(instance.has("c2")).toBe(true);
        expect(instance.get("c2")[5]).toBeUndefined();
    });

    it("does not contain other values (has & get)", () => {
        const instance = Scores.fromEntries([[1n, [2, 3, 4]], [2n, [7, 8, 9]]]);

        expect(instance.has(3n)).toBe(false);
        expect(instance.get(3n)).toEqual([0, 0, 0]);
        expect(instance.has(3n)).toBe(false);
    });

    it("has the correct ngrades", () => {
        expect((Scores.fromEntries([[1n, [2, 3, 4]], [2n, [7, 8, 9]]])).ngrades).toBe(3);
        expect((Scores.fromEntries([[1n, []], [2n, []]])).ngrades).toBe(0);
    });

    describe("has the ReadonlyMap methods", () => {
        it("forEach works", () => {
            const map = Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]]);
            const keys: bigint[] = [];
            const values: (readonly number[])[] = [];

            map.forEach((v, k, m) => {
                keys.push(k);
                values.push(v);
                expect(m).toBe(map);
            });

            expect(keys).toEqual([1n, 2n]);
            expect(values).toEqual([[2, 3], [7, 8]]);
        });

        // get and has are already tested

        it("size works", () => {
            expect(Scores.fromEntries([["c1", [1, 2, 3, 4, 5]], ["c2", [5, 6, 7, 8, 9]]]).size).toBe(2);
        });

        it("[Symbol.iterator] works", () => {
            expect(Array.from(Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]])))
                .toEqual([[1n, [2, 3]], [2n, [7, 8]]]);
        });

        it("entries works", () => {
            expect(Array.from(Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]]).entries()))
                .toEqual([[1n, [2, 3]], [2n, [7, 8]]]);
        });

        it("keys works", () => {
            expect(Array.from(Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]]).keys()))
                .toEqual([1n, 2n]);
        });

        it("values works", () => {
            expect(Array.from(Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]]).values()))
                .toEqual([[2, 3], [7, 8]]);
        });
    });
});


describe("Scores.fromGrades", () => {
    it("has the correct ngrades", () => {
        expect(Scores.fromGrades(100).ngrades).toBe(100);
        expect(Scores.fromGrades(0).ngrades).toBe(0);
    });

    it("returns the expected arrays of the correct size", () => {
        expect(Scores.fromGrades(10).get("f5"))
            .toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        expect(Scores.fromGrades(0).get("c4"))
            .toEqual([]);
    });

    it("is empty according to ReadonlyMap methods", () => {
        const instance = Scores.fromGrades(10);

        expect(() => instance.forEach(() => { throw new Error }))
            .not.toThrow();
        expect(instance.has("Ft")).toBe(false);
        expect(instance.size).toBe(0);
        expect(Array.from(instance)).toEqual([]);
        expect(Array.from(instance.entries())).toEqual([]);
        expect(Array.from(instance.keys())).toEqual([]);
        expect(Array.from(instance.values())).toEqual([]);
    });
});
