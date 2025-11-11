import { type Counter } from "@gouvernathor/python/collections";
import { type Ballots } from "../ballots";

/**
 * To be thrown when an attribution fails to attribute seats,
 * but only in a case where it's an expected limitation of the attribution method.
 * The typical example being the Condorcet standoff, or a majority threshold,
 * but a tie could be another example (though they are usually not checked in provided implementations).
 *
 * Other errors may and will be raised by the attribution methods for other reasons,
 * such as invalid input data, division by zero...
 */
export class AttributionFailure extends Error { }

/**
 * A function to manage how the results from the ballots
 * translate into an allocation of seats.
 *
 * If the attribution method is expected, by design, to fail under expected conditions,
 * such as a majority threshold not being reached,
 * this method should raise an AttributionFailure error.
 *
 * @param votes The ballots.
 * @param rest This parameter, ignored in most cases,
 * forces the attributions taking more required or optional parameters
 * to take them as an options object.
 * Attribution transforms (functions that take an attribution method and return another one)
 * should generally let that parameter pass through
 * so as to avoid breaking features in the wrapped attributions.
 * Attributions should avoid taking other parameters, for the same reason.
 *
 * @returns The attribution of seats to the parties based upon the votes.
 * It is a Counter mapping each party to the number of seats it won.
 * The return value's total() should be equal to the nSeats attributes - if any.
 */
export interface Attribution<Party, B extends Ballots<Party>> {
    (votes: B, rest?: Record<string, any>): Counter<Party, number>;
}
// TODO: for all attributions where it can make sense to start with some apportionned seats,
// add an option to pass some.

/**
 * Most attributions should generally implement this interface,
 * which reflects that the number of seats they allocate is always the same.
 *
 * However, some attributions may yield variable numbers of seats,
 * for instance the pre-2024 federal German system.
 */
export interface HasNSeats {
    readonly nSeats: number;
}
