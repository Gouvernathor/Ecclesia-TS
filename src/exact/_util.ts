import { Fraction, FractionAble } from "@gouvernathor/fraction.ts";

export const FRAC0: Fraction = Fraction.fromNumeric(0n);
export const FRAC1: Fraction = Fraction.fromNumeric(1n);

export function min(array: Iterable<FractionAble>): FractionAble {
    return minBy(array, t => t);
}
export function minBy<T>(array: Iterable<T>, key: (t: T) => FractionAble): T {
    let minElement;
    let minValue: Pick<Fraction, "gt"> = { gt: () => true };
    for (const element of array) {
        const value = Fraction.fromAny(key(element));
        if (minValue.gt(value)) {
            minValue = value;
            minElement = element;
        }
    }
    return minElement!;
}
