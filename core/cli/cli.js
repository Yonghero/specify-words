import { program } from 'commander'
import { resolve } from 'path'
import { bootstrap } from '../index'

export function cli() {
  program
    .option('-c, --config', '读取specify.config.js配置开始解析')
    .action(async ({ config }, options) => {
      let configPath

      if (config) {
        if (options.args.length) {
          configPath = resolve(process.cwd(), options.args[0])
        }
      }
      await bootstrap(configPath)
    })

  program.parse(process.argv)
}
