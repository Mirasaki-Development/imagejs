import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  format: ['cjs', 'esm'],
  entryPoints: ['src/index.ts'],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: false,
  minify: false,
  ...options,
}));
