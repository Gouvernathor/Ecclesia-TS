import { sum } from "@gouvernathor/python";
import { DisagreementFunction } from "../election/voting";
import { OpinionsArray, OpinionsArrayManager } from "./opinionsArray";

// shorthand type aliases
type DiffFunction<N extends number> = DisagreementFunction<OpinionsArray<N>, OpinionsArray<N>>;
type OpinParams<N extends number> = Pick<OpinionsArrayManager<N>, "nOpinions" | "opinMax">;

/**
 * Typically used for comparison between instances of the same kind.
 */
export function symmetricDiff<N extends number>(
    { nOpinions, opinMax }: OpinParams<N>,
): DiffFunction<N> {
    return (a, b) =>
        sum((<number[]><any>a).map((oa, i) => Math.abs(oa - (<number[]><any>b)[i]))) / (nOpinions * 2 * opinMax);
}

/**
 * The second operand is the one ponderating the difference.
 * It's intended as the one whose point of view is taken, the "most human" of the two.
 */
export function ponderedDiff<N extends number>(
    { nOpinions, opinMax }: OpinParams<N>,
): DiffFunction<N> {
    return (a, b) =>
        sum((<number[]><any>a).map((oa, i) => Math.abs(oa - (<number[]><any>b)[i]) * (<number[]><any>b)[i])) / (nOpinions * 2 * (opinMax ** 2));
}

/**
 * The second operand is again the "most human", the one whose point of view is taken.
 * This simulates agreeing plainly with laws that aren't going far enough,
 * but disagreeing with laws that go too far or that go the wrong way.
 *
 * For each opinion:
 * - if A's opinion a is of the opposite sign of B's opinion b, it "goes the wrong way".
 *   - the difference is Math.abs(a * b)
 * - if A's opinion a is of the same sign as B's opinion b but closer to 0, it "doesn't go far enough".
 *   - the difference is 0
 * - otherwise, it "goes too far".
 *   - the difference is Math.abs(a - b)
 */
export function fromMaxDiff<N extends number>(
    { nOpinions, opinMax }: OpinParams<N>,
): DiffFunction<N> {
    return (a, b) => {
        let diffSum = 0;
        for (let i = 0; i < nOpinions; i++) {
            const ao = (<number[]><any>a)[i];
            const bo = (<number[]><any>b)[i];
            if (ao * bo < 0) {
                diffSum += Math.abs(ao * bo);
            } else if (Math.abs(ao) < Math.abs(bo)) {
                ;
            } else {
                diffSum += Math.abs(ao - bo);
            }
        }
        return diffSum / (nOpinions * (opinMax ** 2));
    }
}
