import { describe, expect, it } from "vitest";
import { tallyApprovalToSimple, tallyRankedToOrder, tallyScoreToScores, tallySingleToSimple } from "../../src/election/tallying";
import { NumberCounter } from "@gouvernathor/python/collections";

describe("tallySingleToSimple", () => {
    it("returns a Simple with the expected values", () => {
        const tally = tallySingleToSimple("abcdea");

        expect(tally.size).toBe(5);
        expect(tally.has("c")).toBe(true);
        expect(tally.get("a")).toBe(2);

        expect(tally.get("f")).toBe(0);
        expect(tally.has("f")).toBe(false);

        expect(tallySingleToSimple([]).size).toBe(0);
    });
});

describe("tallyApprovalToSimple", () => {
    it("returns a Simple with the expected values", () => {
        const tally = tallyApprovalToSimple([
            new Set("abc"),
            new Set(),
            new Set("ade"),
        ]);

        expect(tally.size).toBe(5);
        expect(tally.has("c")).toBe(true);
        expect(tally.get("a")).toBe(2);

        expect(tally.get("f")).toBe(0);
        expect(tally.has("f")).toBe(false);

        expect(tallyApprovalToSimple([]).size).toBe(0);
        expect(tallyApprovalToSimple([new Set()]).size).toBe(0);
    });
});

describe("tallyRankedToOrder", () => {
    it("returns a Order with the expected values", () => {
        const arrayOfBallots = [
            ["b", "a", "c", "d", "e"],
            ["d", "c", "e", "b", "a"],
            ["d", "c", "e", "b", "a"],
        ];
        const tally = tallyRankedToOrder(arrayOfBallots);
        const tallyCounter = NumberCounter.fromKeys(tally);

        expect(tallyCounter.total).toBe(arrayOfBallots.length);
        expect(tallyCounter).toEqual(NumberCounter.fromKeys(arrayOfBallots));
    });
});

describe("tallyScoreToScores", () => {
    it("returns a Scores with the expected values", () => {
        const tally = tallyScoreToScores([
            new Map([["a", 4], ["b", 2], ["c", 2]]),
            new Map([["a", 0], ["b", 3], ["c", 2]]),
            new Map([["a", 1], ["b", 4], ["c", 4]]),
        ], { nScores: 5 });

        expect(tally.get("a")[4]).toBe(1);
        expect(tally.get("c")[0]).toBe(0);
        expect(tally.get("c")[2]).toBe(2);
    });

    it("supports an empty iterable as input", () => {
        const tally = tallyScoreToScores([], { nScores: 5 });

        expect(tally.size).toBe(0);
    });
});
