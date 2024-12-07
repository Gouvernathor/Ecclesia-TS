/**
 * The results of a binary vote.
 * The blank votes are not counted. To calculate a threshold on the whole
 * number of members, use vote.votesFor / house.nSeats.
 * To calculate the threshold on the number of duly elected members, use
 * vote.votesFor / sum(house.members.values()).
 */
export class Vote {
    constructor(public readonly votesFor: number, public readonly votesAgainst: number) {}

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
