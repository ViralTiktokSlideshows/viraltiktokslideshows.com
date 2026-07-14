import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@viraltiktokslideshows\/.*/],
  // This is a deployed Hono server, not a published library — nothing
  // consumes apps/server's types, so there's no reason to generate a
  // declaration file. Also sidesteps a real rolldown-plugin-dts bug: when
  // bundling workspace packages' .d.ts files together (via noExternal
  // above), it merges same-specifier import statements and silently drops
  // the `type` modifier in the process, which turns a legitimate type-only
  // import into a bogus runtime import and fails the build with a
  // MISSING_EXPORT error — reproducible even with the import fully split
  // into its own `import type { ... }` statement.
  dts: false,
});
