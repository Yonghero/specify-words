import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { cleandir } from 'rollup-plugin-cleandir'

export default defineConfig({
  input: ['./core/index.js', './core/cli/cli.js'],
  output: {
    dir: './lib',
    format: 'es',
  },
  cache: true,
  plugins: [cleandir('./lib'), nodeResolve(), commonjs(), json()],
  external: ['@babel/parser', '@babel/traverse', '@babel/types', '@babel/core', '@vue/compiler-sfc', 'url', 'fs/promises', 'fs', 'path'],
})
