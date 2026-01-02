import { describe, expect, it } from "vitest";
import { NumberCounter } from "@gouvernathor/python/collections";
import { AttributionFailure } from "../../../src/election/attribution/base";
import { plurality, superMajority } from "../../../src/election/attribution/majorityFactory";
import { Simple } from "../../../src/election/tally";

describe("plurality", () => {
    it("fails with an empty tally", () => {
        const attrib1Seat = plurality({ nSeats: 1 });
        const attrib10Seat = plurality({ nSeats: 10 });

        expect(() => attrib1Seat(NumberCounter.fromEntries([["a", 0]])))
            .toThrow(AttributionFailure);
        expect(() => attrib1Seat(NumberCounter.fromEntries([])))
            .toThrow(AttributionFailure);
        expect(() => attrib1Seat(NumberCounter.fromEntries()))
            .toThrow(AttributionFailure);

        expect(() => attrib10Seat(NumberCounter.fromEntries([["a", 0]])))
            .toThrow(AttributionFailure);
        expect(() => attrib10Seat(NumberCounter.fromEntries([])))
            .toThrow(AttributionFailure);
        expect(() => attrib10Seat(NumberCounter.fromEntries()))
            .toThrow(AttributionFailure);
    });

    it("allocates the seats with a non-majority plurality", () => {
        const attrib10Seat = plurality({ nSeats: 10 });
        const seats = attrib10Seat(NumberCounter.fromKeys("abccde"));

        expect(seats.total).toBe(10);
        expect(seats.get("c")).toBe(10);
    });

    it("allocates the seats with exactly half of the votes", () => {
        const attrib10Seat = plurality({ nSeats: 10 });
        const seats = attrib10Seat(NumberCounter.fromKeys("aaaeee"));

        expect(seats.total).toBe(10);

        // either a or e gets all the seats
        expect([seats.get("a"), seats.get("e")].filter(ns => ns === 10).length).toBe(1);
    });

    it("allocates the seats with an absolute majority", () => {
        const attrib10Seat = plurality({ nSeats: 10 });
        const seats = attrib10Seat(NumberCounter.fromKeys("abcdeeeee"));

        expect(seats.total).toBe(10);
        expect(seats.get("e")).toBe(10);
    });
});

describe("superMajority", () => {
    it("fails with an empty tally and no contingency", () => {
        const attrib1Seat = superMajority({ nSeats: 1, threshold: .5 });
        const attrib10Seat = superMajority({ nSeats: 10, threshold: .5 });

        expect(() => attrib1Seat(NumberCounter.fromEntries([["a", 0]])))
            .toThrow(AttributionFailure);
        expect(() => attrib1Seat(NumberCounter.fromEntries([])))
            .toThrow(AttributionFailure);
        expect(() => attrib1Seat(NumberCounter.fromEntries()))
            .toThrow(AttributionFailure);

        expect(() => attrib10Seat(NumberCounter.fromEntries([["a", 0]])))
            .toThrow(AttributionFailure);
        expect(() => attrib10Seat(NumberCounter.fromEntries([])))
            .toThrow(AttributionFailure);
        expect(() => attrib10Seat(NumberCounter.fromEntries()))
            .toThrow(AttributionFailure);
    });

    it("fails when the threshold is not reached with no contingency", () => {
        const attrib375 = superMajority({ nSeats: 10, threshold: 3/8 });
        const attrib5 = superMajority({ nSeats: 10, threshold: .5 });
        const attrib6875 = superMajority({ nSeats: 10, threshold: 11/16 });

        const tallyThird = NumberCounter.fromKeys("aabcde");
        const tally625 = NumberCounter.fromKeys("aaaaabcd");

        expect(() => attrib375(tallyThird)).toThrow(AttributionFailure);

        expect(() => attrib5(tallyThird)).toThrow(AttributionFailure);

        expect(() => attrib6875(tallyThird)).toThrow(AttributionFailure);
        expect(() => attrib6875(tally625)).toThrow(AttributionFailure);
    });
    it("delegates to the contingency when the threshold is not reached", () => {
        let timesCalled = 0;
        const contingency = (t: any) => {
            expect(t, "incorrect tally passed to the contingency")
                .toBe(contingency.expected);
            timesCalled += 1;
            return null!;
        };

        const attrib375 = superMajority({ nSeats: 10, threshold: 3/8, contingency });
        const attrib5 = superMajority({ nSeats: 10, threshold: .5, contingency });
        const attrib6875 = superMajority({ nSeats: 10, threshold: 11/16, contingency });

        const tallyThird = NumberCounter.fromKeys("aabcde");
        const tally625 = NumberCounter.fromKeys("aaaaabcd");


        contingency.expected = tallyThird;
        attrib375(tallyThird);
        expect(timesCalled).toBe(1);

        attrib5(tallyThird);
        expect(timesCalled).toBe(2);

        attrib6875(tallyThird);
        expect(timesCalled).toBe(3);

        contingency.expected = tally625;
        attrib6875(tally625);
        expect(timesCalled).toBe(4);
    });

    it("fails when the threshold is exactly met with no contingency");
    it("delegates to the contingency when the threshold is exactly met");

    it("allocates the seats when the threshold is satisfied");
});
