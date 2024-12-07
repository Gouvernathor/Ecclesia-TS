/**
 * Deterministic and reseedable RNG with utility methods
 */
export default class RNG {
    private readonly m: number;
    private readonly a: number;
    private readonly c: number;
    private state!: number;
    /**
     * @param seed integer between 0 and 2^31 - 1 ; if not passed, generates it from Math.random()
     */
    constructor(seed?: number|string) {
        // LCG using GCC's constants
        this.m = 0x80000000; // 2**31;
        this.a = 1103515245;
        this.c = 12345;

        this.seed = seed;
    }
    /**
     * @param seed integer between 0 and 2^31 - 1 ; if undefined, generates it from Math.random()
     */
    set seed(seed: number|string|undefined) {
        if (seed === undefined) {
            this.state = Math.floor(Math.random() * (this.m - 1));
        } else {
            if (typeof seed === "string") {
                seed = hashString(seed);
            }
            this.state = Math.abs(seed);
        }
    }
    /**
     * @returns a number presumably in [[0, 2**31[[
     */
    randInt() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }
    /**
     * @returns a number in [0, 1[
     */
    random() {
        return this.randInt() / this.m;
    }
    /**
     * @returns a number in [[min, max[[
     */
    randRange(min: number, max: number) {
        return min + Math.floor(this.random() * (max - min));
    }
    /**
     * @returns one of the elements
     */
    choice<T>(array: T[]) {
        return array[this.randRange(0, array.length)];
    }
    /**
     * Picks k elements from the array without replacement.
     * This reseeds k times, not 1 time.
     * @param k number of elements to choose
     */
    choices<T>(array: T[], {k}: {k: number}): T[] {
        const copy = array.slice();
        return Array(k).map(() => copy.splice(this.randRange(0, copy.length), 1)[0]);
    }
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i<str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
