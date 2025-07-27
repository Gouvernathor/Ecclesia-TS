import { enumerate, max } from "@gouvernathor/python";
import { Counter, DefaultMap } from "@gouvernathor/python/collections";
import { fmean, median } from "@gouvernathor/python/statistics";
import { Scores } from "../ballots";
import { type Attribution, type HasNSeats } from "../attribution";

/**
 * Creates an attribution method in which all the seats go to the candidate with the highest average score.
 *
 * The ballots are not required to grade all the candidates.
 */
export function averageScore<Party>(
    { nSeats }: {
        nSeats: number
    }
): Attribution<Party, Scores<Party>> & HasNSeats {
    const attrib = (votes: Scores<Party>, rest = {}): Counter<Party> => {
        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        return new Counter([[max(counts.keys(), party => fmean(counts.get(party)!)), nSeats]]);
    }
    attrib.nSeats = nSeats;
    return attrib;
}

/**
 * Creates an attribution method in which all the seats go to the candidate with the highest median score.
 *
 * If there is a tie, the contingency method is called on the candidates that are tied.
 * The default contingency is to take the maximum average score.
 *
 * The ballots are not required to grade all the candidates.
 */
export function medianScore<Party>(
    { nSeats, contingency }: {
        nSeats: number,
        contingency?: Attribution<Party, Scores<Party>>,
    }
): Attribution<Party, Scores<Party>> & HasNSeats {
    if (contingency === undefined) {
        contingency = averageScore({ nSeats });
    }

    const attrib = (votes: Scores<Party>, rest = {}): Counter<Party> => {
        const counts = new DefaultMap<Party, number[]>(() => []);
        for (const [party, grades] of votes) {
            for (const [grade, qty] of enumerate(grades)) {
                counts.get(party).push(...Array(qty).fill(grade));
            }
        }

        const medians = new Map(Array.from(counts.entries(),
            ([party, partigrades]) => [party, median(partigrades)]));

        const winScore = Math.max(...medians.values());
        const [winner, ...winners] = [...medians.keys()].filter(p => medians.get(p) === winScore);

        if (winners.length === 0) { // no tie
            return new Counter([[winner, nSeats]]);
        }

        winners.unshift(winner);
        const trimmedResults = Scores.fromEntries(winners.map(party => [party, counts.get(party)!]));
        return contingency(trimmedResults, rest);
    };
    attrib.nSeats = nSeats;
    return attrib;
}
