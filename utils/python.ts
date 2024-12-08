export * as math from "./python/math";

export function sum(array: Iterable<number>, start=0): number {
    return (array instanceof Array ? array : [...array])
        .reduce((a, b) => a + b, start);
}

export function divmod(a: number, b: number): [number, number] {
    return [Math.floor(a / b), a % b];
}

export function range(end: number): number[];
export function range(start: number, end: number): number[];
export function range(start: number, end?: number): number[] {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    return Array(end - start).map((_, i) => i + start);
}

export function* enumerate<T>(array: Iterable<T>, start=0) {
    for (const item of array) {
        yield [start++, item] as const;
    }
}

export function max<T>(array: Iterable<number>): number;
export function max<T>(array: Iterable<T>, key: (n: T) => number): T;
export function max(array: Iterable<any>, key?: (n: any) => number): any {
    if (!(array instanceof Array)) {
        return max([...array], key!);
    }
    if (key === undefined) {
        return array.reduce((a, b) => a > b ? a : b);
    } else {
        return array.reduce((a, b) => key(a) > key(b) ? a : b);
    }
}

export function min<T>(array: Iterable<number>): number;
export function min<T>(array: Iterable<T>, key: (n: T) => number): T;
export function min(array: Iterable<any>, key?: (n: any) => number): any {
    if (!(array instanceof Array)) {
        return min([...array], key!);
    }
    if (key === undefined) {
        return array.reduce((a, b) => a < b ? a : b);
    } else {
        return array.reduce((a, b) => key(a) < key(b) ? a : b);
    }
}
