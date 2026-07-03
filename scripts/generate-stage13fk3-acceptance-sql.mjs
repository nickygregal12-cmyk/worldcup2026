#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  buildStage13FK3AcceptanceSql,
  resolveAcceptanceOutputPath,
} from './lib/stage13fk3AcceptanceSql.mjs'
import { EURO28_PROJECT_REF } from './lib/stagingAdminSql.mjs'

function parseArgs(argv) {
  const values = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`)
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`)
    values[key] = value
    index += 1
  }
  return values
}

try {
  const args = parseArgs(process.argv.slice(2))
  const sql = buildStage13FK3AcceptanceSql({
    action: args.action,
    ownerEmail: args['owner-email'],
    resultsEmail: args['results-email'],
    memberEmail: args['member-email'],
    note: args.note,
  })

  const outputPath = resolveAcceptanceOutputPath(args.output, process.cwd())
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 })
    fs.writeFileSync(outputPath, sql, { mode: 0o600 })
    fs.chmodSync(outputPath, 0o600)
    console.log('Stage 13F-K3 acceptance SQL generated.')
    console.log(`Project ref: ${EURO28_PROJECT_REF}`)
    console.log(`Action: ${args.action}`)
    console.log(`Output: ${outputPath}`)
    console.log('Review every line before running it in the Euro staging SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
