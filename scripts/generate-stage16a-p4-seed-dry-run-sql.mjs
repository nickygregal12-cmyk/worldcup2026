import process from 'node:process'
import {
  EURO28_STAGING_PROJECT_REF,
  buildStage16aP4SeedDryRunSql,
} from './lib/stage16aSeedDryRunSql.mjs'

function projectRefFromArgs(argv) {
  const projectArg = argv.find(arg => arg.startsWith('--project-ref='))
  return projectArg ? projectArg.slice('--project-ref='.length) : EURO28_STAGING_PROJECT_REF
}

try {
  const sql = buildStage16aP4SeedDryRunSql({ projectRef: projectRefFromArgs(process.argv.slice(2)) })
  console.log(sql)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
