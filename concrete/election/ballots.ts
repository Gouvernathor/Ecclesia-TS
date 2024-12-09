import { HasOpinions } from "../../base/actors";
import { Scores } from "../../base/election/ballots";

export class ScoresBase<Party extends HasOpinions> extends Map<Party, number[]> implements Scores<Party> {
    ngrades?: number;

    constructor(...parameters: any[]) {
        super(...parameters);
        if (this.size > 0) {
            this.ngrades = this.values().next().value!.length;
        }
    }

    static fromGrades<Party extends HasOpinions>(ngrades: number): ScoresBase<Party> {
        const ths = new ScoresBase<Party>();
        ths.ngrades = ngrades;
        return ths;
    }

    override get(key: Party): number[] | undefined {
        const value = super.get(key);
        if (value === undefined && this.ngrades !== undefined) {
            return Array(this.ngrades).fill(0);
        }
        return value;
    }
}
