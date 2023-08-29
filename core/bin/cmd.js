#!/usr/bin/env node
import { program } from 'commander'
import { resolve } from 'path'
import { bootstrap } from '../parse.js'

program
  .option('-c, --config', '读取specify.config.js配置开始解析')
  .action(async ({ config }, options) => {
    let configPath

    if (config) {
      if (options.args.length) {
        configPath = resolve(process.cwd(), options.args[0])
      }
    }
    bootstrap(configPath)
  })

program.parse(process.argv)
