import { Fraction, FractionAble } from "@gouvernathor/fraction.ts";

export const FRAC0: Fraction = Fraction.fromNumeric(0n);
export const FRAC1: Fraction = Fraction.fromNumeric(1n);

export function max<T extends FractionAble>(array: Iterable<T>): T {
    return maxBy(array, t => t);
}
export function maxBy<T>(array: Iterable<T>, key: (t: T) => FractionAble): T {
    let maxElement;
    let maxValue: Pick<Fraction, "lt"> = { lt: () => true };
    for (const element of array) {
        const value = Fraction.fromAny(key(element));
        if (maxValue.lt(value)) {
            maxValue = value;
            maxElement = element;
        }
    }
    return maxElement!;
}

export function min<T extends FractionAble>(array: Iterable<T>): T {
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
