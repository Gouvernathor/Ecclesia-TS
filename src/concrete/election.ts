import { HasOpinions } from "../base/actors";
import { Election } from "../base/election";
import { Attribution } from "../base/election/attribution";
import { Ballots } from "../ballots";
import { Voting } from "../base/election/voting";
import { Counter } from "@gouvernathor/python/collections";
import { Collection } from "@gouvernathor/python/collections/abc";
import RNG from "@gouvernathor/rng";

/**
 * Implements the most basic elections : combining a voting method and an attribution method.
 */
export class BaseElection<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>> implements Election<Voter, Party> {
    constructor(
        readonly votingMethod: Voting<Voter, Party, B>,
        readonly attributionMethod: Attribution<Party, B>,
    ) { }

    elect(pool: Collection<Voter>, candidates: Collection<Party>): Counter<Party> {
        return this.attributionMethod.attrib(this.votingMethod.vote(pool, candidates));
    }
}

/**
 * Implements a selection by lottery, directly among the population.
 * Adds the constraint that the voter type and the candidate type are the same.
 */
export class Sortition<Citizen extends HasOpinions> implements Election<Citizen, Citizen> {
    readonly randomObj: RNG;
    constructor(nSeats: number, { }?);
    constructor(nSeats: number, { randomObj }: { randomObj: RNG });
    constructor(nSeats: number, { randomSeed }: { randomSeed: number | string });
    constructor(
        readonly nSeats: number,
        { randomObj, randomSeed }: { randomObj?: RNG, randomSeed?: number | string } = {},
    ) {
        if (randomObj === undefined) {
            randomObj = new RNG(randomSeed);
        }
        this.randomObj = randomObj;
    }

    /**
     * The candidates pool must be the same as the voters pool.
     * (In practice, the candidates argument is ignored.)
     * Returns elements from the voters pool picked without replacement,
     * so the voter pool size must be at least nSeats.
     */
    elect(voters: Collection<Citizen>, candidates?: any): Counter<Citizen> {
        return new Counter(this.randomObj.shuffled(voters, this.nSeats));
    }
}
