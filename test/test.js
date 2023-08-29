import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { bootstrap } from '../lib/parse.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

bootstrap(resolve(__dirname, './routes.js'))
