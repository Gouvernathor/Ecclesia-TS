# Ecclesia

Ecclesia is a framework for political simulations written in TypeScript. It is a reimplementation of what was originally a Ren'Py serious game project, and then a never-finished Python library.

Its purpose is to model just about any representative political system (within a few limitations), including the structure of its parliament and executive, and particularly the electoral system as a whole.

The Actors part represent the political side, the confrontation of opinions, the gathering in Houses and the passage of bills. They include very basic decision-making, which should possibly be refined in more detailed simulations.

The Elections part represents the way the elections work and how the opinions of the citizens translate into the elected representation.

There is currently no documentation : refer to the docstrings of the exposed functions and types.

Most of the package (the election part in particular) was implemented using classes, but version 2 reimplemented it all using functional interfaces, factory functions for those functions, and functional programming in general.
