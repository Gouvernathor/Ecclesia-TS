import { Order, Scores, Simple } from "./tally";

export {
    /** @deprecated use the election/tally submodule instead */
    Simple,
    /** @deprecated use the election/tally submodule instead */
    Order,
    /** @deprecated use the election/tally submodule instead */
    Scores,
};

/** @deprecated will be removed in 3.0 */
export type Ballots<Party> = Simple<Party> | Order<Party> | Scores<Party>;
