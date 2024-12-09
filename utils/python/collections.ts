import { sum } from "../python";

export interface ReadonlyCounter<T> extends ReadonlyMap<T, number> {
    get(key: T): number;
    elements(): Iterable<T>;
    total: number;
    pos: Counter<T>;
    neg: Counter<T>;
}

/**
 * T must not be a 2-tuple.
 */
export class Counter<T> extends Map<T, number> implements ReadonlyCounter<T> {
    private static getMapEntriesFromIterable<T>(
        iterable?: Iterable<T> | Iterable<[T, number]>,
    ): Iterable<[T, number]> {
        if (iterable === undefined) {
            return [];
        }
        if (iterable instanceof Map) {
            return iterable.entries();
        } else {
            let array = ((iterable instanceof Array) ? iterable : [...iterable]) as T[] | [T, number][];
            if (array.length && !(array[0] instanceof Array && array[0].length === 2)) {
                array = (array as T[]).map(item => [item, 1] as [T, number]);
            }
            return array as [T, number][];
        }
    }

    constructor(iterable?: Iterable<T> | Iterable<[T, number]>) {
        super(Counter.getMapEntriesFromIterable(iterable));
    }

    static fromkeys<T>(keys: Iterable<T>, value: number) {
        return new Counter<T>([...keys].map(key => [key, value] as [T, number]));
    }

    override get(key: T): number {
        return super.get(key) || 0;
    }

    increment(key: T, value = 1) {
        this.set(key, this.get(key) + value);
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

    update(iterable?: Iterable<T> | Iterable<[T, number]>) {
        if (iterable) {
            for (const [item, count] of Counter.getMapEntriesFromIterable(iterable)) {
                this.increment(item, count);
            }
        }
    }

    subtract(iterable: Iterable<T>) {
        if (iterable) {
            for (const [item, count] of Counter.getMapEntriesFromIterable(iterable)) {
                this.increment(item, -count);
            }
        }
    }

    /**
     * Mimics the unary + operator.
     * Returns a new Counter with only the positive counts.
     */
    get pos() {
        return this.posneg(1);
    }

    /**
     * Mimics the unary - operator.
     * Returns a new Counter with inverted counts,
     * filtered to only the now-positive counts.
     */
    get neg() {
        return this.posneg(-1);
    }

    private posneg(mul: 1 | -1): Counter<T> {
        const copy = new Counter<T>();
        for (const [key, value] of this) {
            if (value * mul > 0) {
                copy.set(key, value * mul);
            }
        }
        return copy;
    }
}

export class DefaultMap<K, V> extends Map<K, V> {
    constructor(public factory: (key: K) => V, iterable?: Iterable<[K, V]>) {
        super(iterable);
    }

    override get(key: K): V {
        if (!this.has(key)) {
            this.set(key, this.factory(key));
        }
        return super.get(key)!;
    }
}
