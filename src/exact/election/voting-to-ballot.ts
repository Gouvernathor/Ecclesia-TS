import { Fraction, FractionAble } from "@gouvernathor/fraction.ts";
import { Ranked, Single } from "../../election/ballot";
import { VotingToBallot } from "../../election/voting-to-ballot";
import { minBy } from "../_util";

export interface DisagreementFunction<T, U> {
    (t: T, u: U): FractionAble;
}


/**
 * The most basic and widespread voting system :
 * the voter chooses one of the available candidates,
 * or (not implemented here) for none of them.
 */
export function singleVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Single<Candidate>> {
    return (voter, candidates) =>
        minBy(candidates, party => disagree(voter, party));
}

/**
 * The voter ranks all, or (not implemented here) some, of the candidates.
 */
export function orderingVote<Voter, Candidate>(
    { disagree }: {
        disagree: DisagreementFunction<Voter, Candidate>,
    }
): VotingToBallot<Voter, Candidate, Ranked<Candidate>> {
    return (voter, candidates) =>
        Array.from(candidates).sort((a, b) => Fraction.compare(disagree(voter, a), disagree(voter, b)));
}
