# Ecclesia

Ecclesia is a framework for political simulations written in TypeScript. It is a reimplementation of what was originally a Ren'Py serious game project, and then a never-finished Python library.

Its purpose is to model just about any representative political system (within a few limitations), including the structure of its parliament and executive, and particularly the electoral system as a whole.

The Actors part represent the political side, the confrontation of opinions, the gathering in Houses and the passage of bills. They include very basic decision-making, which should possibly be refined in more detailed simulations.

The Elections part represents the way the elections work and how the opinions of the citizens translate into the elected representation.

There is currently no documentation : refer to the docstrings of the exposed functions and types.

Most of the package (the election part in particular) was implemented using classes, but version 2 reimplemented it all using functional interfaces, factory functions for those functions, and functional programming in general.

## election
### Notions

Three elements are supposed to be provided as inputs to the election system:
- Voter objects, which are passed through and treated as opaque objects
- Candidate or Party objects, which are also passed through and treated as opaque objects
  - despite the nomenclature of the term Party, nothing prevents you from having elections where candidates are individuals, rather than lists.
  - it is also possible to have the same objects as Voter and Candidate. Again, the election system will handle that opaquely.
- a function which provides how much disagreement exists between a given voter and a given candidate
  - It could do that by reading properties on the two objects, or reading a shared state storage... up to the user of the library.

The job of the library is to convert the various base elements into a tally of ballots, and then into a seat attribution.

It is possible in some cases to skip the ballots step, and even the disagreement function : for instance, when you simulate a sortition.
But most elections will go through that process.

### Election method

An election method is a function which transforms a pool of voters and a pool of candidates into a seat attribution : a number of seats for each candidate.

An election method is usually built from a voting method and an attribution method, whose creation may require other things to be provided (such as a disagreement function).

### Voting methods

A voting method is a function which transforms a pool of voters and a pool of candidates into a tally of ballots.

**This library does not simulate individual ballots by individual voters, but only a global tally of ballots (plural).**
For instance, the ballot for a classic FPTP election is not the same as the ballot for approval voting, but the tally is the same : a number of ballot for each candidate.
(There are other types of tallies, for instance for score voting or rank voting.
If you want to simulate individual voter choices, you will need to program the function yourself.
However if you tally your ballots into a tally format supported by this library, you will still be able to use our attribution methods for the second part of the election.

This library will require you to provide a disagreement function (and, sometimes, other parameters) between a given type of voter and candidate, in order to build a voting method for these two types.
The standard built-in voting methods include the single vote, approval voting, ranked voting, and score voting.

### Attribution methods

An attribution method is a function which transforms a tally of ballots into a seat attribution.
Notably, the attribution system does not know of the voters, only of the candidates - which are part of the ballots.

Attribution methods usually support only a single type of ballot, which will inform the return type you require of the voting method, and limit the available choice of voting methods.
Some choices may be functionally equivalent, but will not be represented the same way;
for example it is said that approval voting is just score voting with two available scores, but the attribution of an approval vote will generally be conducted the same way as that of a single vote.
If you want an attribution for score votings, you will need a different voting method function (with a different return type) than the typical approval voting method.

### Utilities

Also included in this library is a number of functions which will change the behavior of your attribution, election, or voting methods (which are functions).
For instance, by adding an electoral threshold to a proportional attribution, or by pre-shuffling the candidates and voters to make a voting method more balanced.
