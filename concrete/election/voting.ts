import { HasOpinions } from "../../base/actors";
import { Order, Scores, Simple } from "../../base/election/ballots";
import { Voting } from "../../base/election/voting";
import { min } from "../../utils/python";

/**
 * The most basic and widespread voting system : each voter casts one ballot for
 * one of the available candidates, or (not implemented here) for none of them.
 */
export class SingleVote<Voter extends HasOpinions, Party extends HasOpinions> extends Voting<Voter, Party, Simple<Party>> {
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Simple<Party> {
        const scores = Simple.fromkeys(candidates, 0);
        const partees = this.randomObj.shuffled(candidates);
        for (const voter of voters) {
            // find the party with which disagreement is minimal
            // add it a ballot
            scores.increment(min(partees, party => voter.disagree(party)));
        }
        return scores;
    }
}

/**
 * Each voter ranks all or (not implemented here) some of the candidates.
 */
export class OrderingVote<Voter extends HasOpinions, Party extends HasOpinions> extends Voting<Voter, Party, Order<Party>> {
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Order<Party> {
        const order = new Order<Party>();
        const partees = this.randomObj.shuffled(candidates);
        for (const voter of voters) {
            order.push(partees.slice()
                .sort((a, b) => voter.disagree(a) - voter.disagree(b)));
        }
        return order;
    }
}

/**
 * Each voter gives a note (or grade) to each candidate.
 * The number of grades must be provided to the constructor.
 *
 * This one is not as straightforward as the two previous ones, even setting
 * strategic voting aside.
 * What is to be considered to be the range of grades to cover ?
 * From nazis to angels, or from the worst present candidate to the best ?
 * The answer lies only in the minds of the voters.
 * The latter is more akin to OrderingVote, so I made the former the default,
 * but it causes issues for lower grades so ApprovalVote uses the latter.
 */
export class CardinalVote<Voter extends HasOpinions, Party extends HasOpinions> extends Voting<Voter, Party, Scores<Party>> {
    ngrades: number;
    constructor({ngrades, ...rest}: {ngrades: number}) {
        super(rest);
        this.ngrades = ngrades;
    }

    /**
     * Each voter gives a grade to each party proportional to the raw disagreement.
     * This may yield situations where every party is graded 0, especially with
     * low ngrades values.
     */
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Scores<Party> {
        const scores = Scores.fromGrades<Party>(this.ngrades);
        const partees = this.randomObj.shuffled(candidates);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            for (const party of partees) {
                let grade = Math.floor(this.ngrades * (1 - voter.disagree(party)));
                if (grade === this.ngrades) {
                    grade--;
                }
                scores.get(party)![grade]++;
            }
        }
        return scores;
    }
}
