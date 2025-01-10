import { Collection } from "@gouvernathor/python/collections/abc";
import RNG from "../../utils/RNG";
import { HasOpinions } from "../actors";
import { Ballots } from "./ballots";

/**
 * This represents the rules for citizens to cast ballots.
 */
export abstract class Voting<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>> {
    protected randomObj;
    constructor({ }?);
    constructor({ randomObj }: { randomObj: RNG });
    constructor({ randomSeed }: { randomSeed: number | string });
    constructor({ randomObj, randomSeed }:
        { randomObj?: RNG, randomSeed?: number | string } = {},
    ) {
        if (randomObj === undefined) {
            randomObj = new RNG(randomSeed);
        }
        this.randomObj = randomObj;
    }

    /**
     * @returns the ballots cast by the voters
     * @param voters the opinionated voters. They are generally citizens, but it
     * could also be parties in some situations (indirect elections for instance).
     * Their disagreement with the candidate parties are quantified by the .disagree
     * method, supported by the HasOpinions class.
     */
    abstract vote(voters: Collection<Voter>, candidates: Collection<Party>): B;
}
