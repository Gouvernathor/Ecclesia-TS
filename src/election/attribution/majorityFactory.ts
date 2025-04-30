import { max } from "@gouvernathor/python";
import { Counter } from "@gouvernathor/python/collections";
import { type Simple } from "../ballots";
import { type Attribution, AttributionFailure, type HasNSeats } from "../attribution";

/**
 * Creates an attribution method in which
 * the party with the most votes wins all the seats.
 *
 * Will throw an AttributionFailure error if no party wins any vote.
 */
export function plurality<Party>(
    { nSeats }: {
        nSeats: number,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const win = max(votes.keys(), p => votes.get(p)!);

        if (votes.get(win)! > 0) {
            return new Counter([[win, nSeats]]);
        }
        throw new AttributionFailure("No party won any vote");
    };
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which a candidate needs to reach
 * a certain percentage of the votes in order to win all the seats.
 *
 * If not party reaches the threshold, the contingency attribution method is called,
 * or if no contingency is provided, an AttributionFailure error is thrown.
 */
export function superMajority<Party>(
    { nSeats, threshold, contingency = null }: {
        nSeats: number,
        threshold: number,
        contingency?: Attribution<Party, Simple<Party>> | null,
    }
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const win = max(votes.keys(), p => votes.get(p)!);

        if ((votes.get(win)! / votes.total) > threshold) {
            return new Counter([[win, nSeats]]);
        }
        if (contingency === null) {
            throw new AttributionFailure("No party reached the threshold");
        }
        return contingency(votes, rest);
    };
    attrib.nSeats = nSeats;
    return attrib;
}
