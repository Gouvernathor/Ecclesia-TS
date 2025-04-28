import { defineConfig } from 'tsup'

export default defineConfig({
    // **/* is the required recognized pattern, * and ** are not enough.
    entry: ["src/**/*.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
});
