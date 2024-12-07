import { sum } from "../python";

export function fmean(values: number[], weights?: number[]): number {
    if (weights === undefined) {
        return sum(values) / values.length;
    }
    // return sum(values.map((v, i) => v * weights[i])) / sum(weights); // ?
    throw new Error("Not implemented");
}

export function median(values: number[]): number {
    const sorted = values.slice().sort();
    const n = sorted.length;
    if (n % 2 === 0) {
        return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }
    return sorted[(n - 1) / 2];
}
