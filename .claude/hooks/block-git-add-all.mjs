#!/usr/bin/env node
// PreToolUse(Bash) guard for CLAUDE.md §0.4: "Never `git add .` — stage files explicitly by name."
//
// Fires on EVERY Bash call rather than relying on the hook `if` filter, because a filter
// that fails to match fails OPEN — and failing open is the exact outcome this guard exists
// to prevent. Parsing is done here instead of with jq: jq is not installed on the owner's Mac.
//
// Contract (docs: code.claude.com/docs/en/hooks): PreToolUse receives the tool call as JSON
// on stdin; exit 0 with a permissionDecision of "deny" blocks the call and shows the reason.

import process from 'node:process'
import fs from 'node:fs'

const COMMAND_SEPARATORS = /\s*(?:&&|\|\||;|\|&|\||&|\n)\s*/
// Wrappers Claude Code itself strips before matching Bash rules, plus the shells that would hide a git call.
const WRAPPERS = new Set(['timeout', 'time', 'nice', 'nohup', 'stdbuf', 'xargs', 'sudo', 'env', 'command'])
// git global options that consume the following token, so we don't mistake their value for the subcommand.
const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--exec-path', '--namespace'])
// Pathspecs that mean "everything", which is precisely what §0.4 forbids.
const EVERYTHING_PATHSPECS = new Set(['.', './', '.\\', '*', ':/', ':/*', ':(top)'])

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** Split a shell string into whitespace-separated tokens, honouring simple quoting. */
function tokenize(segment) {
  const tokens = []
  let current = ''
  let quote = null
  let started = false

  for (const char of segment) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      started = true
      continue
    }
    if (/\s/.test(char)) {
      if (started || current) tokens.push(current)
      current = ''
      started = false
      continue
    }
    current += char
  }
  if (started || current) tokens.push(current)
  return tokens
}

/**
 * Return the offending token if this segment is a `git add` that stages everything,
 * or null if it is not a blocking `git add` at all.
 */
function offendingToken(segment) {
  let tokens = tokenize(segment)

  // Drop leading env assignments (FOO=bar git add .) and process wrappers, including each
  // wrapper's own arguments — `timeout 30 git add -A` must still be seen as a `git add`.
  for (;;) {
    if (!tokens.length) return null
    const head = tokens[0]
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(head)) {
      tokens = tokens.slice(1)
      continue
    }
    if (WRAPPERS.has(head.split('/').pop())) {
      tokens = tokens.slice(1)
      // Consume the wrapper's flags and values (`30`, `30s`, `-n 10`, `--signal=KILL`).
      while (tokens.length && (tokens[0].startsWith('-') || /^\d+[smhd]?$/.test(tokens[0]))) {
        tokens = tokens.slice(1)
      }
      continue
    }
    break
  }

  const binary = tokens[0].split('/').pop()
  if (binary !== 'git') return null

  // Walk past git's own global options to find the subcommand.
  let i = 1
  while (i < tokens.length && tokens[i].startsWith('-')) {
    const opt = tokens[i]
    const bare = opt.split('=')[0]
    if (GIT_OPTS_WITH_VALUE.has(bare) && !opt.includes('=')) i += 2
    else i += 1
  }
  if (tokens[i] !== 'add') return null

  // Everything after `add` is either a flag or a pathspec.
  for (const token of tokens.slice(i + 1)) {
    if (token === '--') continue
    if (EVERYTHING_PATHSPECS.has(token)) return token
    if (token === '--all' || token === '--update' || token === '--no-ignore-removal') return token
    // Short flags, possibly bundled: -A, -u, -Av, -vA.
    if (/^-[A-Za-z]+$/.test(token) && (token.includes('A') || token.includes('u'))) return token
  }
  return null
}

const raw = readStdin()
let command = ''
try {
  command = JSON.parse(raw)?.tool_input?.command ?? ''
} catch {
  // Malformed payload: fail open rather than bricking every Bash call in the session.
  process.exit(0)
}
if (typeof command !== 'string' || !command.trim()) process.exit(0)

for (const segment of command.split(COMMAND_SEPARATORS)) {
  const token = offendingToken(segment)
  if (!token) continue

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Blocked by CLAUDE.md §0.4: "Never \`git add .\` — stage files explicitly by name." ` +
          `This command stages everything via \`${token}\`. ` +
          `Re-run it naming each path: \`git add path/one.ts path/two.css\`. ` +
          `Use \`git status --short\` to see what is outstanding first.`,
      },
    }),
  )
  process.exit(0)
}

process.exit(0)
