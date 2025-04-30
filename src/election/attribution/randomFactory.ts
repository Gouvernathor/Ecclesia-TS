import { Counter } from "@gouvernathor/python/collections";
import { createRandomObj, type RandomObjParam } from "../../utils";
import { type Simple } from "../ballots";
import { type Attribution, type HasNSeats } from "../attribution";

/**
 * Randomized attribution.
 * Everyone votes, then one ballot is selected at random.
 * (One ballot per seat to fill, and assuming there's
 * enough ballots that the picking is with replacement.)
 *
 * The randomization is based on the given parameters. If a RNG object
 * is passed, it is used without reseeding across all calls of the attribution.
 * If a seed is passed, the random object is reseeded
 * at each call of the attribution.
 */
export function randomize<Party>(
    { nSeats, ...randomParam }: {
        nSeats: number,
    } & RandomObjParam
): Attribution<Party, Simple<Party>> & HasNSeats {
    const attrib = (votes: Simple<Party>, rest = {}): Counter<Party> => {
        const randomObj = createRandomObj(randomParam);
        return new Counter(randomObj.choices([...votes.keys()], { weights: [...votes.values()], k: nSeats }));
    };
    attrib.nSeats = nSeats;
    return attrib;
}
