import { Counter } from "@gouvernathor/python/collections";
import { type Collection } from "@gouvernathor/python/collections/abc";
import { type Ballots } from "./election/ballots";
import { type Voting } from "./election/voting";
import { type Attribution } from "./election/attribution";
import { createRandomObj, type RandomObjParam } from "./utils";

/**
 * A function to go from a set of opinionated voters
 * to the elected representatives, the number of seats for each candidate.
 *
 * @param voters A pool of voters such as taken by the Voting functions.
 * @returns A multi-set (a Counter) of elected representatives as returned by an Attribution.
 */
export interface Election<Voter, Party> {
    (voters: Collection<Voter>, candidates: Collection<Party>): Counter<Party>;
}


/**
 * Implements the most basic elections : combining a voting method and an attribution method.
 */
export function standardElection<Voter, Party, B extends Ballots<Party>>(
    { votingMethod, attributionMethod }: {
        votingMethod: Voting<Voter, Party, B>,
        attributionMethod: Attribution<Party, B>,
    }
): Election<Voter, Party> {
    return (pool: Collection<Voter>, candidates: Collection<Party>): Counter<Party> => {
        return attributionMethod(votingMethod(pool, candidates));
    };
}

/**
 * Implements a selection by lottery, directly among the population.
 * Adds the supplementary constraint that the voter type and the candidate type must be the same.
 *
 * The pool of candidates and the pool of citizens must be the same.
 * (Implementation detail : this is not enforced, and the pool of candidates is ignored.)
 * Returns elements from the pool picked without replacement,
 * so the pool must be at least nSeats in size.
 */
export function sortition<Citizen>(
    { nSeats, ...randomParam }: {
        nSeats: number,
    } & RandomObjParam
): Election<Citizen, Citizen> {
    return (citizens: Collection<Citizen>): Counter<Citizen> => {
        const randomObj = createRandomObj(randomParam);
        return new Counter(randomObj.shuffled(citizens, nSeats));
    };
}
