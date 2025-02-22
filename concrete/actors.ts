import { HasOpinions } from "../base/actors";
import { Election } from "../base/election";
import { sum } from "@gouvernathor/python";
import { Counter } from "@gouvernathor/python/collections";
import { Collection } from "@gouvernathor/python/collections/abc";
import { BaseElection } from "./election";

// Disagreement functions
// These may be used to implement HasOpinions.disagree

export type diffFunction = (opinionsA: number[], opinionsB: number[], nopinions: number, opinmax: number) => number;

/**
 * Typically for comparing instance of the same HasOpinions subclass.
 */
export function symmetricDiff(
    opinionsA: number[],
    opinionsB: number[],
    nopinions: number,
    opinmax: number,
): number {
    return sum(opinionsA.map((opinionA, i) => Math.abs(opinionA - opinionsB[i]))) / (nopinions * 2 * opinmax);
}

/**
 * The second operand is the one ponderating the difference.
 * It's the one whose point of view is taken, the "most human" of the two.
 */
export function ponderedDiff(
    opinionsA: number[],
    opinionsB: number[],
    nopinions: number,
    opinmax: number,
): number {
    return sum(opinionsA.map((opinionA, i) => Math.abs(opinionA - opinionsB[i]) * opinionsB[i])) / (nopinions * 2 * (opinmax ** 2));
}

/**
 * The second operand is again the "most human", the one whose point of view is taken.
 * This simulates agreeing plainly with laws that aren't going far enough,
 * but disagreeing with laws that go too far or that go the wrong way.
 * For each opinion:
 * - if A's opinion a is of the opposite sign of B's opinion b, it "goes the wrong way".
 *   - the difference is Math.abs(a * b)
 * - if A's opinion a is of the same sign as B's opinion b but closer to 0, it "doesn't go far enough".
 *   - the difference is 0
 * - otherwise, it "goes too far".
 *   - the difference is Math.abs(a - b)
 */
export function fromMaxDiff(
    opinionsA: number[],
    opinionsB: number[],
    nopinions: number,
    opinmax: number,
): number {
    const diffs = [];
    for (let i = 0; i < nopinions; i++) {
        const a = opinionsA[i];
        const b = opinionsB[i];
        if (a * b < 0) {
            diffs.push(Math.abs(a * b));
        } else if (Math.abs(a) < Math.abs(b)) {
            diffs.push(0);
        } else {
            diffs.push(Math.abs(a - b));
        }
    }
    return sum(diffs) / (nopinions * (opinmax ** 2));
}


// Other classes

/**
 * The results of a binary vote.
 * The blank votes are not counted. To calculate a threshold on the whole
 * number of members, use vote.votesFor / house.nSeats.
 * To calculate the threshold on the number of duly elected members, use
 * vote.votesFor / sum(house.members.values()).
 */
export class Vote {
    constructor(public readonly votesFor: number, public readonly votesAgainst: number) { }

    /**
     * Returns the reverse of the vote, inverting the for/against ratio.
     * Simulates a vote on the opposite motion.
     */
    get neg(): Vote {
        return new Vote(this.votesAgainst, this.votesFor);
    }

    get votesCast(): number {
        return this.votesFor + this.votesAgainst;
    }

    /**
     * Returns the ratio of votes for over the total number of votes cast.
     * If there are no votes cast, returns an Infinity.
     */
    get ratio(): number {
        return this.votesFor / this.votesCast;
    }

    /**
     * Returns the votes in order of decreasing ratio.
     * The ties are ordered by decreasing number of positive votes,
     * and then by the order they came in.
     */
    static order(votes: Vote[]): Vote[] {
        return votes
            .sort((a, b) => (b.ratio - a.ratio) || (b.votesFor - a.votesFor));
    }
}

/**
 * An electoral district relating to a House.
 *
 * Several district objects can represent the same territory and have the same
 * voter pool, and yet relate to different Houses : this is normal.
 * For example, the districts for the US state of Wyoming would be as follows:
 * - one for the three presidential electors
 * - one for the lone federal representative
 * - one or possibly two (depending on the implementation) for the two federal senators
 * All three or four of these districts would have the same voter pool, yet be
 * different objects because they relate to different Houses, even in the case where
 * they would have the same election method.
 */
class District<Voter extends HasOpinions, Party extends HasOpinions> {
    identifier?: string | number;
    nSeats?: number;
    constructor(
        public electionMethod: Election<Voter, Party>,
        public voters: Voter[],
        { identifier, nSeats }: { identifier?: string | number, nSeats?: number } = {},
    ) {
        this.identifier = identifier;
        if (nSeats === undefined) {
            try {
                nSeats = (electionMethod as BaseElection<Voter, Party, any>).attributionMethod.nSeats;
            } catch (e) { }
        }
        this.nSeats = nSeats;
    }

    election(candidates: Collection<Party>): Counter<Party> {
        return this.electionMethod.elect(this.voters, candidates);
    }
}

/**
 * A whole House of Parliament.
 * Some constraints:
 * - all members have the same voting power
 * - staggering is not supported - that is, when general elections don't
 *   renew all the seats at once, like in the french or US senates - though
 *   subclasses may implement it by overriding the election method and subclassing
 *   District, for instance.
 */
export class House<Voter extends HasOpinions, Party extends HasOpinions> {
    districts: Map<District<Voter, Party>, Counter<Party>>;
    name?: string;
    majority?: number;
    constructor(
        districts: Iterable<District<Voter, Party>> | Map<District<Voter, Party>, Counter<Party>>,
        { name, majority = .5 }: { name?: string, majority?: number } = {},
    ) {
        if (!(districts instanceof Map)) {
            districts = new Map([...districts].map(d => [d, new Counter()]));
        }
        this.districts = districts as Map<District<Voter, Party>, Counter<Party>>;
        this.name = name;
        this.majority = majority;
    }

    /**
     * Returns a Counter linking each party to the number of seats it holds,
     * regardless of the district.
     * For the array (with repetitions) of the individual members, use the
     * members.elements() method.
     */
    get members(): Counter<Party> {
        const coun = new Counter<Party>();
        for (const dmembers of this.districts.values()) {
            coun.update(dmembers);
        }
        return coun;
    }

    /**
     * If all districts support providing a theoretical number of seats,
     * returns the total. Otherwise, returns undefined.
     */
    get nSeats(): number | undefined {
        let nSeats = 0;
        for (const district of this.districts.keys()) {
            if (district.nSeats === undefined) {
                return undefined;
            }
            nSeats += district.nSeats;
        }
        return nSeats;
    }

    /**
     * Triggers an election in each electoral district, returns the members result.
     */
    election(candidates: Collection<Party>): Counter<Party> {
        const members = new Counter<Party>();
        for (const district of this.districts.keys()) {
            const elected = district.election(candidates);
            this.districts.set(district, elected);
            members.update(elected);
        }
        return members;
    }

    /**
     * Returns the state of the vote on something having an opinion.
     * The object of the vote may be a motion or bill, but also a person to elect
     * or to confirm.
     */
    vote<T extends HasOpinions>(target: T): Vote {
        let votesFor = 0;
        let votesAgainst = 0;
        for (const [party, nSeats] of this.members) {
            const disag = party.disagree(target);
            if (disag > 0) {
                votesFor += nSeats;
            } else if (disag < 0) {
                votesAgainst += nSeats;
            }
        }
        return new Vote(votesFor, votesAgainst);
    }
}
