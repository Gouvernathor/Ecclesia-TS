import { HasOpinions } from "../../base/actors";
import { Order, Simple } from "../../base/election/ballots";
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
