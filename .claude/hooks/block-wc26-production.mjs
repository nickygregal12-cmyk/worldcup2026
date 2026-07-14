#!/usr/bin/env node
// PreToolUse(Bash) guard for CLAUDE.md §2: the WC26 production Supabase project is
// PERMANENTLY off-limits. Any command mentioning its project ref is blocked outright.
//
// This is the runtime half of a pair. scripts/check-database-safety.mjs already guards the
// ref AT REST (migrations, supabase/config.toml, the linked project-ref file) and runs inside
// `npm run check`. Nothing stopped an agent from simply TYPING the ref into a psql, curl,
// supabase-cli or npx command — a check that runs after the fact cannot un-write a row.
// This hook closes that gap: no Bash command carrying the ref ever executes.
//
// Deliberately a substring match on the RAW stdin payload, not on a parsed field. A blunt
// scan cannot be defeated by a malformed payload or an unexpected tool_input shape, and it
// fails CLOSED — for the one rule in this repo where a false positive is cheap (rename the
// variable, quote it differently) and a false negative is unrecoverable.
//
// Contract (docs: code.claude.com/docs/en/hooks): exit 0 with permissionDecision "deny" blocks.

import process from 'node:process'
import fs from 'node:fs'

const WC26_PRODUCTION_REF = 'ouhxawizadnwrhrjppld'
const EURO28_STAGING_REF = 'gcfdwobpnanjchcnvdco'

let raw = ''
try {
  raw = fs.readFileSync(0, 'utf8')
} catch {
  process.exit(0)
}

if (!raw.toLowerCase().includes(WC26_PRODUCTION_REF)) process.exit(0)

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Blocked by CLAUDE.md §2: this command references the WC26 PRODUCTION Supabase project ` +
        `(${WC26_PRODUCTION_REF}), which is permanently off-limits to every session in this repo. ` +
        `This is not a prompt you can approve — remove the reference. ` +
        `Euro 2028 staging is ${EURO28_STAGING_REF}, and any staging write requires a fresh verified backup first, every time. ` +
        `If you believe you genuinely need production, STOP and report it to Nicky instead.`,
    },
  }),
)
process.exit(0)
