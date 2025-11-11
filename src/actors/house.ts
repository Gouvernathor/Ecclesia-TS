import { Counter, NumberCounter } from "@gouvernathor/python/collections";
import { Election } from "../election";
import { Collection } from "@gouvernathor/python/collections/abc";
import { Vote } from "./vote";
import { DisagreementFunction } from "../election/voting";

/**
 * An electoral district relating to a House.
 *
 * Several district objects can represent the same territory and have the same
 * voter pool, but relate to different Houses : this is normal.
 * For example, the districts for the US state of Wyoming would be as follows:
 * - one for the three presidential electors
 * - one for the lone federal representative
 * - one or possibly two (depending on the implementation) for the two federal senators
 * All three or four of these districts would have the same voter pool, yet be
 * different objects because they relate to different Houses, even assuming
 * they have the same election method.
 */
export class District<Voter, Party> {
    identifier?: string | number;
    nSeats?: number;
    constructor(
        public electionMethod: Election<Voter, Party>,
        public voters: Voter[],
        { identifier, nSeats }: { identifier?: string | number, nSeats?: number } = {},
    ) {
        if (identifier !== undefined)
            this.identifier = identifier;
        // if (nSeats === undefined) {
        //     try {
        //         nSeats = (electionMethod as BaseElection<Voter, Party, any>).attributionMethod.nSeats;
        //     } catch (e) { }
        // }
        if (nSeats !== undefined)
            this.nSeats = nSeats;
    }

    election(candidates: Collection<Party>): Counter<Party, number> {
        return this.electionMethod(this.voters, candidates);
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
export class House<Voter, Party> {
    districts: Map<District<Voter, Party>, Counter<Party, number>>;
    name?: string;
    majority?: number;
    constructor(
        districts: Iterable<District<Voter, Party>> | Map<District<Voter, Party>, Counter<Party, number>>,
        { name, majority = .5 }: { name?: string, majority?: number } = {},
    ) {
        if (!(districts instanceof Map)) {
            districts = new Map([...districts].map(d => [d, NumberCounter.fromEntries<Party>([])]));
        }
        this.districts = districts as Map<District<Voter, Party>, Counter<Party, number>>;
        if (name !== undefined)
            this.name = name;
        this.majority = majority;
    }

    /**
     * Returns a Counter linking each party to the number of seats it holds,
     * regardless of the district.
     * For the array (with repetitions) of the individual members, use the
     * members.elements() method.
     */
    get members(): Counter<Party, number> {
        const coun = NumberCounter.fromEntries<Party>([]);
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
    election(candidates: Collection<Party>): Counter<Party, number> {
        const members = NumberCounter.fromEntries<Party>([]);
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
    vote<T>(
        target: T,
        { disagree }: { disagree: DisagreementFunction<Party, T> },
    ): Vote {
        let votesFor = 0;
        let votesAgainst = 0;
        for (const [party, nSeats] of this.members) {
            const disag = disagree(party, target);
            if (disag > 0) {
                votesFor += nSeats;
            } else if (disag < 0) {
                votesAgainst += nSeats;
            }
        }
        return new Vote(votesFor, votesAgainst);
    }
}
