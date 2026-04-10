import { describe, expect, it } from "vitest";
import { NumberCounter } from "@gouvernathor/python/collections";
import { defaultMetric } from "../../../src/election/attribution/metrics";

describe("defaultMetric", () => {
    it("returns 0 for an exact match", () => {
        const votes = NumberCounter.fromKeys("aaabbc");
        const seats = votes;
        const metricResult = defaultMetric({ votes, seats });

        expect(metricResult).toBe(0);
    });

    it("does not error out when a party has no votes", () => {
        const votes = NumberCounter.fromKeys("aaabbc");
        const seats = NumberCounter.fromKeys("abcd");
        expect(() => defaultMetric({ votes, seats }).not.toThrow();
    });

    it("does not error out when a party has no seats", () => {
        const votes = NumberCounter.fromKeys("aaabbc");
        const seats = NumberCounter.fromKeys("ab");
        expect(() => defaultMetric({ votes, seats }).not.toThrow();
    });

    it("returns consistent results when a party has a very low number of seats", () => {
        const votes = NumberCounter.fromKeys("aaabbc");
        const seatsNoC = NumberCounter.fromKeys("a".repeat(150)+"b".repeat(100));
        const seatsWithC = NumberCounter.fromKeys("a".repeat(150)+"b".repeat(100)+"c");

        const metricResultNoC = defaultMetric({ votes, seats: seatsNoC });
        const metricResultWithC = defaultMetric({ votes, seats: seatsWithC });

        expect(metricResultNoC).toBeGreaterThan(metricResultWithC);
    });

    it("returns a decreasing value for increasing accuracy", () => {
        const votes = NumberCounter.fromKeys("a".repeat(101)+"b".repeat(100)+"c".repeat(99));
        const seats1 = NumberCounter.fromKeys("a".repeat(8)+"b".repeat(2)+"c".repeat(2));
        const seats2 = NumberCounter.fromKeys("a".repeat(5)+"b".repeat(4)+"c".repeat(3));

        const metricResult1 = defaultMetric({ votes, seats: seats1 });
        const metricResult2 = defaultMetric({ votes, seats: seats2 });

        expect(metricResult1).toBeGreaterThan(metricResult2);
    });
});
