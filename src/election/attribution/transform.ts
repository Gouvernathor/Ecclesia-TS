import { Counter } from "@gouvernathor/python/collections";
import { Simple } from "../ballots";
import { Attribution, AttributionFailure } from "../attribution";

/**
 * Transforms a standard proportional attribution method into one that requires a certain threshold
 * (percentage of the total votes) to be reached by the parties in order to receive seats.
 * Mostly useful for proportional attribution methods -
 * but works for any simple-ballot-based attribution method.
 *
 * Replaces the Proportional class implementation.
 *
 * If the attribution implements a certain type
 * that extends Attribution<Party, Simple<Party>>
 * without adding any new method or property,
 * such as Proportional,
 * and if the contingency implements the same type, null, or undefined / not passed,
 * then it can be considered that the returned value implements that type too.
 *
 * @param threshold The threshold, between 0 and 1
 * @param contingency The fallback attribution in case the threshold is not reached by any party.
 * It takes an Attribution, or undefined (the default), or null.
 * Null in this case has the specific behavior that if no party reaches the threshold,
 * an AttributionFailure error will be raised.
 * If undefined (or nothing is passed), the contingency will default to running
 * the same attribution method without the threshold.
 * @param attribution The votes passed to this attribution method are guaranteed to be above the threshold,
 * except if the contingency is undefined and no party reached the threshold
 * (in that case, all parties will be passed).
 */
export function addThresholdToSimpleAttribution<Party>(
    { threshold, attribution, contingency }: {
        threshold: number,
        attribution: Attribution<Party, Simple<Party>>,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> {
    // const threshold_ = threshold;
    if (contingency === undefined) {
        // contingency = (votes: Simple<Party>, rest) => {
        //     threshold = 0;
        //     try {
        //         return attrib(votes, rest);
        //     } finally {
        //         threshold = threshold_;
        //     }
        // };
        contingency = attribution;
    }

    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        if (threshold > 0) {
            const original_votes = votes;
            const votes_threshold = threshold * votes.total;
            votes = new Counter<Party>([...votes.entries()].filter(([_, v]) => v >= votes_threshold));
            if (votes.size === 0) {
                if (contingency === null) {
                    throw new AttributionFailure("No party reached the threshold");
                }
                return contingency(original_votes, rest);
            }
        }
        return attribution(votes, rest);
    };
    return attrib;
}
