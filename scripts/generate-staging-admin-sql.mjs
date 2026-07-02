#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  assertSafeOutputPath,
  buildStagingAdminSql,
  EURO28_PROJECT_REF,
} from './lib/stagingAdminSql.mjs'

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
  const sql = buildStagingAdminSql({
    action: args.action,
    email: args.email,
    role: args.role,
    note: args.note,
  })

  const outputPath = assertSafeOutputPath(args.output, process.cwd())
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 })
    fs.writeFileSync(outputPath, sql, { mode: 0o600 })
    fs.chmodSync(outputPath, 0o600)
    console.log('Euro staging administrator SQL generated.')
    console.log(`Project ref: ${EURO28_PROJECT_REF}`)
    console.log(`Output: ${outputPath}`)
    console.log('Review the file before running it in the Supabase SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
