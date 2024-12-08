import { Counter } from "../utils/python/collections";
import { HasOpinions } from "./actors";

/**
 * Implements the rules to go from a set of opinionated voters
 * to the elected representatives of a given party.
 */
export interface Election<Voter extends HasOpinions, Party extends HasOpinions> {
    /**
     * Takes a pool of voters such as taken by the Voting class,
     * and returns a multi-set of elected representatives as returned
     * by the Attribution class.
     */
    elect(voters: Collection<Voter>, candidates: Collection<Party>): Counter<Party>;
}
