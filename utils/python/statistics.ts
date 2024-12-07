import { sum } from "../python";

export function fmean(values: number[], weights?: number[]): number {
    if (weights === undefined) {
        return sum(values) / values.length;
    }
    // return sum(values.map((v, i) => v * weights[i])) / sum(weights); // ?
    throw new Error("Not implemented");
}
