export * from "./attribution/base";

// 2.0.x exports

export {
    addThresholdToSimpleAttribution,
} from "./attribution/transform";
export {
    type Proportional,
    type RankIndexMethod,
    type RankIndexFunction,
    proportionalFromRankIndexFunction,
    type DivisorMethod,
    type DivisorFunction,
    rankIndexFunctionFromDivisorFunction,
    proportionalFromDivisorFunction,
} from "./attribution/proportionalBase";
export {
    plurality,
    superMajority,
} from "./attribution/majorityFactory";
export {
    instantRunoff,
    bordaCount,
    condorcet,
} from "./attribution/orderingFactory";
export {
    averageScore,
    medianScore,
} from "./attribution/scoreFactory";
export {
    jefferson,
    dHondt,
    webster,
    sainteLague,
    hamilton,
    hareLargestRemainders,
    huntingtonHill,
    highestAverages,
    largestRemainders,
} from "./attribution/proportionalFactory";
export {
    randomize,
} from "./attribution/randomFactory";


// 2.1.x exports

export {
    boundedRankIndexMethod,
} from "./attribution/proportionalBase";
