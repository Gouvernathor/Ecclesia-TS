import { Counter } from "@gouvernathor/python/collections";
import { Collection } from "@gouvernathor/python/collections/abc";
import RNG from "@gouvernathor/rng";

type HasOpinions = any; // placeholder
type Ballots<Party> = any; // placeholder
type Voting<Voter, Party, B> = any; // placeholder
type Attribution<Party, B> = any; // placeholder

export type Election<Voter extends HasOpinions, Party extends HasOpinions> =
    (voters: Collection<Voter>, candidates: Collection<Party>) => Counter<Party>;

export function BaseElection<Voter extends HasOpinions, Party extends HasOpinions, B extends Ballots<Party>>(
    votingMethod: Voting<Voter, Party, B>,
    attributionMethod: Attribution<Party, B>,
): Election<Voter, Party> {
    return (voters: Collection<Voter>, candidates: Collection<Party>) => {
        return attributionMethod.attrib(votingMethod.vote(voters, candidates));
    };
}

export function Sortition<Citizen extends HasOpinions>(
    nSeats: number,
    {}?,
): Election<Citizen, Citizen>;
export function Sortition<Citizen extends HasOpinions>(
    nSeats: number,
    { randomObj }: { randomObj: RNG },
): Election<Citizen, Citizen>;
export function Sortition<Citizen extends HasOpinions>(
    nSeats: number,
    { randomSeed }: { randomSeed: number | string },
): Election<Citizen, Citizen>;
export function Sortition<Citizen extends HasOpinions>(
    nSeats: number,
    { randomObj, randomSeed }: { randomObj?: RNG, randomSeed?: number | string } = {},
): Election<Citizen, Citizen> {
    if (randomObj === undefined) {
        randomObj = new RNG(randomSeed);
    }
    return (voters: Collection<Citizen>, candidates?: any) => {
        return new Counter(randomObj.shuffled(voters, nSeats));
    };
}
