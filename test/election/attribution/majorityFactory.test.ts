import { describe, expect, it } from "vitest";
import { NumberCounter } from "@gouvernathor/python/collections";
import { AttributionFailure } from "../../../src/election/attribution/base";
import { plurality, superMajority } from "../../../src/election/attribution/majorityFactory";

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
    it("fails with an empty tally", () => {
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

    it("fails when the threshold is not reached");
    it("fails when the threshold is exactly met");
    it("allocates the seats when the threshold is satisfied");
});
