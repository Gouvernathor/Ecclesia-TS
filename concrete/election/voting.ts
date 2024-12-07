import { HasOpinions } from "../../base/actors";
import { Simple } from "../../base/election/ballots";
import { Voting } from "../../base/election/voting";
import { min } from "../../utils/python";

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
