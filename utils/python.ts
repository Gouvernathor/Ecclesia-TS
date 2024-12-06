export * as math from "./python/math";

export function sum(array: number[]): number {
    return array.reduce((a, b) => a + b, 0);
}

export function range(end: number): number[];
export function range(start: number, end: number): number[];
export function range(start: number, end?: number): number[] {
    if (end === undefined) {
        return [...Array(start).keys()];
    } else {
        return Array.from({ length: end - start }, (_, i) => i + start);
    }
}
