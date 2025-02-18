//src/server.ts
import 'dotenv/config'
import { createServer } from 'node:http'
import express from 'express'
import { grafserv } from 'postgraphile/grafserv/express/v4'
import { pgl } from './pgl.js'

const app = express()
const server = createServer(app)
server.on('error', () => {})
const serv = pgl.createServ(grafserv)
serv.addTo(app, server).catch((e) => {
  console.error(e)
  process.exit(1)
})
server.listen(5050)

console.log('Server listening at http://localhost:5050')
