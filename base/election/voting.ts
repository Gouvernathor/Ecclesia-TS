import { HasOpinions } from "../actors";
import { Ballot } from "./ballots";

/**
 * This represents the rules for citizens to cast ballots.
 */
export interface Voting<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballot<Party>> {
    /**
     * @returns the ballots cast by the voters
     * @param pool the opinionated voters. They are generally citizens, but it
     * could also be parties in some situations (indirect elections for instance).
     * Their disagreement with the candidate parties are quantified by the .disagree
     * method, supported by the HasOpinions class.
     */
    vote(pool: Collection<Voter>): B;
}
