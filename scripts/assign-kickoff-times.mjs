#!/usr/bin/env node
// Provisional kick-off time assignment (placeholder times for testing).
//
// Edit the KICKOFF_SLOTS mapping below, then run this script to (re)generate
// the idempotent SQL that sets matches.kickoff_at for all 51 Euro 2028 fixtures.
// Re-run any time to adjust times once real broadcast schedules are confirmed.
//
//   node scripts/assign-kickoff-times.mjs                 # SQL to stdout
//   node scripts/assign-kickoff-times.mjs --output out.sql
//
// Apply the generated SQL to the target database (local: psql inside the
// supabase_db container; staging: Supabase SQL Editor). The SQL is idempotent:
// it recomputes kickoff_at from each match's existing scheduled_date every run,
// so editing a slot and re-running is always safe.
//
// What this deliberately does NOT do:
//   - no schema change, no migration file (kickoff_at already exists);
//   - it only sets the TIME portion — the calendar date comes from the existing
//     matches.scheduled_date already seeded from the official UEFA schedule;
//   - it does not touch scoring, resolver, Supabase Auth, team identity, venues,
//     schedule_status or the "Provisional" team tag. These are placeholder
//     kick-off times, but nothing is visually tagged "provisional" for time —
//     the UI simply shows matches.kickoff_at (see src/matchCentre/MatchCentre.jsx
//     and src/journey/OriginalBracket.jsx, which render the time when present).
//
// ── TIMEZONE CONVENTION (must stay consistent with the fake clock) ───────────
// kickoff_at is `timestamptz` — an absolute UTC instant. The times below are
// written as UK WALL-CLOCK times and converted with `AT TIME ZONE 'Europe/London'`,
// which is BST-aware. Euro 2028 (9 Jun – 9 Jul) is entirely in British Summer
// Time (BST = UTC+1), so the three UK slots map to UTC as:
//     14:00 UK  ->  13:00 UTC
//     17:00 UK  ->  16:00 UTC
//     20:00 UK  ->  19:00 UTC   (UK wall-clock minus one hour)
// This is EXACTLY the convention the fake-clock scenario runner uses
// (scripts/stage16a-p6c-executor.mjs KICKOFF_HOURS_UTC = [13, 16, 19], and its
// effectiveKickoff() test asserts slot 1/2/3 = 13:00/16:00/19:00 UTC). The
// runner now reads kickoff_at directly, so the value written here is what
// `npm run scenario:set-time` compares against when deciding live/final.
// When you pass a time to scenario:set-time, give it as UTC (…Z) or with an
// explicit offset so it is unambiguous — e.g. 8pm UK == "…T19:00:00Z".

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// ── The three sanctioned Euro kick-off slots (UK wall-clock time) ────────────
const SLOT_2PM = '14:00'
const SLOT_5PM = '17:00'
const SLOT_8PM = '20:00'
const VALID_SLOTS = new Set([SLOT_2PM, SLOT_5PM, SLOT_8PM])

// ── EDIT ME: kick-off slot per match number ─────────────────────────────────
// Football-scheduling logic used for this placeholder distribution:
//   - Opening match (1) and the Final (51): always 20:00 UK (confirmed rule).
//   - Group matchdays 1–2 with three matches/day: spread 14:00 / 17:00 / 20:00.
//   - Two-match days (opening group tail, final knockout-adjacent days): 17:00 / 20:00.
//   - Final group round (matchdays 3, days 20–21 Jun): the two matches in the
//     SAME group kick off simultaneously (real UEFA rule) — one group at 17:00,
//     the other at 20:00.
//   - Knockouts (R16, QF) two per day: 17:00 / 20:00. Semi-finals & Final: 20:00.
// Dates are NOT encoded here — only the time slot. The date is read live from
// each match's scheduled_date, so this mapping stays correct if dates ever move.
const KICKOFF_SLOTS = Object.freeze({
  // ── Group stage · Matchday 1 ──
  1: SLOT_8PM,                                   // 09 Jun — opening match (single fixture)
  2: SLOT_2PM, 3: SLOT_5PM, 4: SLOT_8PM,         // 10 Jun
  5: SLOT_2PM, 6: SLOT_5PM, 7: SLOT_8PM,         // 11 Jun
  8: SLOT_2PM, 9: SLOT_5PM, 10: SLOT_8PM,        // 12 Jun
  11: SLOT_5PM, 12: SLOT_8PM,                    // 13 Jun (two matches)
  // ── Group stage · Matchday 2 ──
  13: SLOT_2PM, 14: SLOT_5PM, 15: SLOT_8PM,      // 14 Jun
  16: SLOT_2PM, 17: SLOT_5PM, 18: SLOT_8PM,      // 15 Jun
  19: SLOT_2PM, 20: SLOT_5PM, 21: SLOT_8PM,      // 16 Jun
  22: SLOT_2PM, 23: SLOT_5PM, 24: SLOT_8PM,      // 17 Jun
  // ── Group stage · Matchday 3 (simultaneous within each group) ──
  25: SLOT_5PM, 26: SLOT_5PM,                    // 18 Jun — Group A pair
  27: SLOT_8PM, 28: SLOT_8PM,                    // 19 Jun — Group B pair
  29: SLOT_5PM, 30: SLOT_5PM,                    // 20 Jun — Group C pair (early)
  31: SLOT_8PM, 32: SLOT_8PM,                    // 20 Jun — Group D pair (late)
  33: SLOT_5PM, 34: SLOT_5PM,                    // 21 Jun — Group E pair (early)
  35: SLOT_8PM, 36: SLOT_8PM,                    // 21 Jun — Group F pair (late)
  // ── Round of 16 (two per day) ──
  37: SLOT_5PM, 38: SLOT_8PM,                    // 24 Jun
  39: SLOT_5PM, 40: SLOT_8PM,                    // 25 Jun
  41: SLOT_5PM, 42: SLOT_8PM,                    // 26 Jun
  43: SLOT_5PM, 44: SLOT_8PM,                    // 27 Jun
  // ── Quarter-finals (two per day) ──
  45: SLOT_5PM, 46: SLOT_8PM,                    // 30 Jun
  47: SLOT_5PM, 48: SLOT_8PM,                    // 01 Jul
  // ── Semi-finals (evening) ──
  49: SLOT_8PM,                                  // 04 Jul
  50: SLOT_8PM,                                  // 05 Jul
  // ── Final ──
  51: SLOT_8PM,                                  // 09 Jul — Final
})

const EXPECTED_MATCH_COUNT = 51

// ── Validation ──────────────────────────────────────────────────────────────
function validate() {
  const numbers = Object.keys(KICKOFF_SLOTS).map(Number).sort((a, b) => a - b)
  if (numbers.length !== EXPECTED_MATCH_COUNT) {
    throw new Error(`KICKOFF_SLOTS must cover exactly ${EXPECTED_MATCH_COUNT} matches, found ${numbers.length}`)
  }
  for (let n = 1; n <= EXPECTED_MATCH_COUNT; n += 1) {
    if (!(n in KICKOFF_SLOTS)) throw new Error(`KICKOFF_SLOTS is missing match ${n}`)
    if (!VALID_SLOTS.has(KICKOFF_SLOTS[n])) {
      throw new Error(`Match ${n} has invalid slot "${KICKOFF_SLOTS[n]}" (allowed: ${[...VALID_SLOTS].join(', ')})`)
    }
  }
  // Confirmed real constraints: opening match and Final are always 20:00 UK.
  if (KICKOFF_SLOTS[1] !== SLOT_8PM) throw new Error('Match 1 (opening) must be 20:00 UK')
  if (KICKOFF_SLOTS[EXPECTED_MATCH_COUNT] !== SLOT_8PM) throw new Error('The Final must be 20:00 UK')
}

// ── SQL generation ──────────────────────────────────────────────────────────
function buildSql() {
  const rows = Object.keys(KICKOFF_SLOTS)
    .map(Number)
    .sort((a, b) => a - b)
    .map(n => `    (${n}, '${KICKOFF_SLOTS[n]}')`)
    .join(',\n')

  return `-- Generated by scripts/assign-kickoff-times.mjs. Do not hand-edit this SQL;
-- edit the KICKOFF_SLOTS mapping in the script and regenerate instead.
--
-- Provisional / placeholder kick-off times for testing (fake clock + UI). These
-- are NOT confirmed broadcast times. Only the TIME portion is set here; the date
-- comes from each match's existing scheduled_date. kickoff_at is timestamptz
-- (absolute UTC); UK wall-clock times are converted BST-aware via Europe/London.

begin;

update public.matches m
set
  kickoff_at = ((m.scheduled_date::text || ' ' || assignment.uk_local_time)::timestamp
                 at time zone 'Europe/London'),
  updated_at = now()
from (
  values
${rows}
) as assignment(match_number, uk_local_time)
where m.tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and m.match_number = assignment.match_number;

-- Fail the whole transaction loudly if the result is not exactly right.
do $verify$
declare
  euro_tournament_id uuid := (select id from public.tournaments where code = 'euro-2028');
  set_count integer;
  bad_slot_count integer;
  opener_hour integer;
  final_hour integer;
begin
  select count(*) into set_count
  from public.matches
  where tournament_id = euro_tournament_id and kickoff_at is not null;
  if set_count <> ${EXPECTED_MATCH_COUNT} then
    raise exception 'Expected ${EXPECTED_MATCH_COUNT} matches with a kick-off time, found %', set_count;
  end if;

  -- Every kick-off must land on one of the three sanctioned UTC slots (13/16/19)
  -- on the minute — this is the invariant the fake clock relies on.
  select count(*) into bad_slot_count
  from public.matches
  where tournament_id = euro_tournament_id
    and (
      extract(hour from (kickoff_at at time zone 'UTC')) not in (13, 16, 19)
      or extract(minute from (kickoff_at at time zone 'UTC')) <> 0
    );
  if bad_slot_count > 0 then
    raise exception '% matches have a kick-off outside the 13:00/16:00/19:00 UTC slots', bad_slot_count;
  end if;

  select extract(hour from (kickoff_at at time zone 'UTC')) into opener_hour
  from public.matches where tournament_id = euro_tournament_id and match_number = 1;
  select extract(hour from (kickoff_at at time zone 'UTC')) into final_hour
  from public.matches where tournament_id = euro_tournament_id and match_number = ${EXPECTED_MATCH_COUNT};
  if opener_hour <> 19 then raise exception 'Opening match must be 20:00 UK (19:00 UTC), got % UTC', opener_hour; end if;
  if final_hour <> 19 then raise exception 'Final must be 20:00 UK (19:00 UTC), got % UTC', final_hour; end if;
end
$verify$;

commit;
`
}

// ── Entry point (mirrors scripts/assign-candidate-teams.mjs) ────────────────
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
  validate()
  const sql = buildSql()

  if (args.output) {
    const outputPath = path.resolve(process.cwd(), args.output)
    if (!outputPath.startsWith(process.cwd())) throw new Error('Output path must stay inside the repository')
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, sql)
    console.log('Kick-off time assignment SQL generated.')
    console.log(`Output: ${outputPath}`)
    console.log('Review the file, then apply it with psql or the Supabase SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
