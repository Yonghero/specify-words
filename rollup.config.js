import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default defineConfig({
  input: './core/parse.js',
  output: [
    {
      dir: 'lib',
      format: 'es',
      entryFileNames: () => '[name].mjs',
    },
    {
      dir: 'lib',
      format: 'cjs',
      exports: 'named',
      entryFileNames: () => '[name].cjs',
    },
  ],
  plugins: [nodeResolve(), commonjs(), json()],
  external: ['@babel/parser', '@babel/traverse', '@babel/types', '@babel/core', '@vue/compiler-sfc', 'url', 'fs/promises', 'fs', 'path'],
})
