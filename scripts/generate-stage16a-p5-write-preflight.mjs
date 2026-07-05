#!/usr/bin/env node
import { buildStage16aP5WritePreflightReport } from './lib/stage16aSeedWritePreflight.mjs'

const projectArg = process.argv.find(arg => arg.startsWith('--project-ref='))
const projectRef = projectArg ? projectArg.slice('--project-ref='.length) : undefined

console.log(buildStage16aP5WritePreflightReport({ projectRef }))
