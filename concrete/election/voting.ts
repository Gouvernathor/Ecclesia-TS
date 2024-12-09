import { HasOpinions } from "../../base/actors";
import { Order, Scores, ScoresBase, Simple } from "../../base/election/ballots";
import { Voting } from "../../base/election/voting";
import { min } from "../../utils/python";
import { Counter } from "../../utils/python/collections";

/**
 * The most basic and widespread voting system : each voter casts one ballot for
 * one of the available candidates, or (not implemented here) for none of them.
 */
export class SingleVote<Voter extends HasOpinions, Party extends HasOpinions> extends Voting<Voter, Party, Simple<Party>> {
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Simple<Party> {
        const scores = Counter.fromkeys(candidates, 0);
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
        const order: Party[][] = [];
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
    constructor({ ngrades, ...rest }: { ngrades: number }) {
        super(rest);
        this.ngrades = ngrades;
    }

    /**
     * Each voter gives a grade to each party proportional to the raw disagreement.
     * This may yield situations where every party is graded 0, especially with
     * low ngrades values.
     */
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Scores<Party> {
        const scores = ScoresBase.fromGrades<Party>(this.ngrades);
        const partees = this.randomObj.shuffled(candidates);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            for (const party of partees) {
                const grade = Math.min(this.ngrades - 1,
                    Math.floor(this.ngrades * (1 - voter.disagree(party))));
                scores.get(party)![grade]++;
            }
        }
        return scores;
    }
}

/**
 * Alternative implementation of CardinalVote.
 */
export class BalancedCardinalVote<Voter extends HasOpinions, Party extends HasOpinions> extends CardinalVote<Voter, Party> {
    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Scores<Party> {
        const scores = ScoresBase.fromGrades<Party>(this.ngrades);
        const partees = this.randomObj.shuffled(candidates);

        // if the disagreement is .0, the grade will be ngrades-1 and not ngrades
        for (const voter of voters) {
            const prefs = new Map<Party, number>(partees.map(party => [party, 1 - voter.disagree(party)]));
            const minpref = Math.min(...prefs.values());
            let maxpref = Math.max(...prefs.values());

            if (minpref !== maxpref) { // avoid division by zero
                maxpref -= minpref;
            }

            for (const party of partees) {
                const grade = Math.min(this.ngrades - 1,
                    Math.floor(this.ngrades * (prefs.get(party)! - minpref) / maxpref));
                scores.get(party)![grade]++;
            }
        }

        return scores;
    }
}

/**
 * Each voter approves or disapproves each of the candidates
 *
 * Technically a special case of grading vote where grades are 0 and 1,
 * but it makes it open to additional attribution methods (proportional ones
 * for example). That's why the format it returns is not the same as with CardinalVote.
 * Of you want a scores-like attribution, use BalancedCardinalVote(2) instead.
 */
export class ApprovalVote<Voter extends HasOpinions, Party extends HasOpinions> extends Voting<Voter, Party, Simple<Party>> {
    private static cardinal = new BalancedCardinalVote({ ngrades: 2 });

    override vote(voters: Collection<Voter>, candidates: Collection<Party>): Simple<Party> {
        const scores = ApprovalVote.cardinal.vote(voters, candidates) as Scores<Party>;
        const approvals = new Counter<Party>();
        for (const [party, [_disapp, app]] of scores) {
            approvals.increment(party, app);
        }
        return approvals;
    }
}
