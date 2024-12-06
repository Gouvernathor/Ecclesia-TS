import { sum } from "../python";

export class Counter<T> extends Map<T, number> {
    constructor(iterable?: Iterable<T>) {
        if (iterable instanceof Map) {
            super(iterable);
        } else {
            super();
            this.update(iterable);
        }
    }

    override get(key: T): number {
        return super.get(key) || 0;
    }

    *elements() {
        for (const [key, count] of this) {
            for (let i = 0; i < count; i++) {
                yield key;
            }
        }
    }

    get total() {
        return sum(this.values());
    }

    update(iterable?: Iterable<T>) {
        if (iterable) {
            if (iterable instanceof Map) {
                for (const [item, count] of iterable) {
                    this.set(item, (this.get(item)||0) + count);
                }
            } else {
                for (const item of iterable) {
                    this.set(item, (this.get(item)||0) + 1);
                }
            }
        }
    }

    subtract(iterable: Iterable<T>) {
        if (iterable) {
            if (iterable instanceof Map) {
                for (const [item, count] of iterable) {
                    this.set(item, (this.get(item)||0) - count);
                }
            } else {
                for (const item of iterable) {
                    this.set(item, (this.get(item)||0) - 1);
                }
            }
        }
    }

    /**
     * Mimics the unary + operator.
     * Returns a new Counter with only the positive counts.
     */
    pos() {
        const copy = new Counter<T>();
        for (const [key, value] of this) {
            if (value > 0) {
                copy.set(key, value);
            }
        }
        return copy;
    }

    /**
     * Mimics the unary - operator.
     * Returns a new Counter with inverted counts,
     * filtered to only the now-positive counts.
     */
    neg() {
        const copy = new Counter<T>();
        for (const [key, value] of this) {
            if (value < 0) {
                copy.set(key, -value);
            }
        }
        return copy;
    }
}
