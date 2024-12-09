import { defineConfig } from 'tsup'

export default defineConfig({
    // **/* is the required recognized pattern, * and ** are not enough.
    entry: ["base/**/*.ts", "concrete/**/*.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
});