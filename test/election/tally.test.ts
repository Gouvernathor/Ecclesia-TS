import { describe, expect, it } from "vitest";
import { Scores } from "../../src/election/tally";

describe("Scores.fromEntries", () => {
    it("fails on empty input", () => {
        expect(() => Scores.fromEntries([])).toThrow();
    });

    it("contains the passed values", () => {
        const instance = Scores.fromEntries([["c1", [1, 2, 3, 4, 5]], ["c2", [5, 6, 7, 8, 9]]]);

        expect(instance.has("c1")).toBe(true);
        expect(instance.get("c1")[3]).toBe(4);

        expect(instance.has("c2")).toBe(true);
        expect(instance.get("c2")[5]).toBeUndefined();
    });

    it("does not contain other values", () => {
        const instance = Scores.fromEntries([[1n, [2, 3, 4]], [2n, [7, 8, 9]]]);

        expect(instance.has(3n)).toBe(false);
        expect(instance.get(3n)).toEqual([0, 0, 0]);
        expect(instance.has(3n)).toBe(false);
    });

    it("has the correct ngrades", () => {
        expect((Scores.fromEntries([[1n, [2, 3]], [2n, [7, 8]]])).ngrades).toBe(2);
        expect((Scores.fromEntries([[1n, []], [2n, []]])).ngrades).toBe(0);
    });
});
// Scores.prototype.get
// Scores.prototype.ngrades
// ReadonlyMap methods


// describe("Scores.fromGrades", () => {});
// Scores.prototype.get
// Scores.prototype.ngrades
// ReadonlyMap methods
