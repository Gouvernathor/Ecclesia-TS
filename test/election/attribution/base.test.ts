import { describe, expect, it } from "vitest";
import { AttributionFailure } from "../../../src/election/attribution/base";

describe("AttributionFailuer", () => {
    it("is a strict subclass of Error", () => {
        expect(AttributionFailure)
            .toSatisfy(AF => AF.prototype instanceof Error);
    });
});
