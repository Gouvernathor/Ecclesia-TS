import { Counter } from "../../utils/python/collections";
import { HasOpinions } from "../actors";
import { Ballots, Simple } from "./ballots";

/**
 * Thrown when an attribution fails to attribute seats.
 * This is only in the case where it's an expected limitation of the attribution
 * method, the typical example being the Condorcet standoff, or a majority
 * threshold, but a tie could be another example (though they are usually
 * not checked in provided implementations).
 * Other errors may and will be raised by the attribution methods for other
 * reasons, such as invalid input data, division by zero...
 */
export class AttributionFailure extends Error { }

/**
 * Manages how the results from the ballots determine the allocation of seats.
 */
export interface Attribution<Party extends HasOpinions, B extends Ballots<Party>> {
    /**
     * The nseats attribute should generally be set in the constructor and be fixed.
     * However, some attributions may yield variable numbers of seats, for instance
     * the federal German system.
     */
    nseats?: number;

    /**
     * Returns the attribution of seats to the parties based upon the votes.
     * The return value is a counter mapping each party to the number of seats
     * it won. The return value's total() should be equal to the instance's nseats
     * attributes.
     *
     * If the attribution method is expected, by design, to fail under expected
     * conditions, such as a majority threshold not being reached, this method
     * should raise an AttributionFailure error.
     */
    attrib(votes: B): Counter<Party>;
}
