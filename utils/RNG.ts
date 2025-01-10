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
    constructor(seed?: number | string) {
        // LCG using GCC's constants
        this.m = 0x80000000; // 2**31;
        this.a = 1103515245;
        this.c = 12345;

        this.seed = seed;
    }
    /**
     * @param seed integer between 0 and 2^31 - 1 ; if undefined, generates it from Math.random()
     */
    set seed(seed: number | string | undefined) {
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
    randRange(max: number): number;
    randRange(min: number, max: number): number;
    randRange(min: number, max?: number): number {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + Math.floor(this.random() * (max - min));
    }
    /**
     * @returns one of the elements
     */
    choice<T>(array: ReadonlyArray<T>) {
        return array[this.randRange(0, array.length)];
    }
    /**
     * Picks k elements from the array with replacement.
     * This reseeds k times, not 1 time.
     * @param k number of elements to choose
     * @param weights if provided, the probability of each element to be chosen
     */
    choices<T>(array: ReadonlyArray<T>, { k, weights }: { k: number, weights?: ReadonlyArray<number> }): T[] {
        if (weights === undefined) {
            return Array.from({length: k}, () => this.choice(array));
        } else {
            const gen = this.weightedChoicesGenerator(array, weights);
            return Array.from({length: k}, () => gen.next().value!);
        }
    }
    /**
     * Warning: this generator is infinite.
     * It reseeds at every generation.
     */
    *weightedChoicesGenerator<T>(array: ReadonlyArray<T>, weights: ReadonlyArray<number>) {
        const cumWeights = weights.map((w, i) => weights.slice(0, i + 1).reduce((a, b) => a + b, 0));
        const maxCumWeight = cumWeights[cumWeights.length - 1];
        while (true) {
            const rand = this.random() * maxCumWeight;
            const idx = cumWeights.findIndex(w => w > rand);
            yield array[idx];
        }
    }
    /**
     * @param maxLen the number of elements to return, defaults to the length of the input
     * @returns an array with the same elements in random order (without replacement)
     */
    shuffled<T>(input: Iterable<T>, maxLen?: number): T[] {
        const copy = [...input];
        if (maxLen === undefined) {
            maxLen = copy.length;
        }
        return Array.from({length: maxLen}, () => copy.splice(this.randRange(0, copy.length), 1)[0]);
    }
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
