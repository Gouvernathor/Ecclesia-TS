/** A ballot for a single candidate */
export type Single<Candidate> = Candidate;

/** A ballot ranking candidates */
export interface Ranked<Candidate> extends ReadonlyArray<Candidate> {}

/** A ballot approving candidates */
export interface Approval<Candidate> extends ReadonlySet<Candidate> {}

/** A ballot giving a score to candidates */
export interface Score<Candidate> extends ReadonlyMap<Candidate, number> {}
