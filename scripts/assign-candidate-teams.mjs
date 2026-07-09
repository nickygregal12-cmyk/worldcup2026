#!/usr/bin/env node
// Candidate team pool seeding and draw-slot assignment (STAGE-CANDIDATE-TEAM-POOL-1).
//
// Edit the SLOT_ASSIGNMENTS mapping below to match your predicted draw, then run
// this script. Re-run any time to update assignments before the real draw locks.
//
//   node scripts/assign-candidate-teams.mjs                 # SQL to stdout
//   node scripts/assign-candidate-teams.mjs --output out.sql
//
// Apply the generated SQL to the target database (local: psql inside the
// supabase_db container; staging: Supabase SQL Editor). The SQL is idempotent:
// the team pool upserts on slug, and all 24 slots are cleared and reassigned in
// one transaction, so swapping two teams between slots is always safe.
//
// What this deliberately does NOT do (per docs/CANDIDATE-TEAM-POOL-BRIEF.md):
//   - no schema change, no migration file;
//   - qualification_status stays 'provisional' and is_provisional stays true --
//     flipping those is a future step once the real draw happens;
//   - no scoring, resolver or prediction data is touched. Predictions bind to
//     slot structure, never to team identity, so reassignment cannot move picks.
//
// Display flows through tournament_teams.metadata (label + isoCode), which is
// what the app reads for names and flags (see guestReferenceModel.normaliseTeam
// and design-system/teamFlagRegistry.js). team_id is set alongside for
// referential integrity, Team Profile reads and the future qualified flip.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// ── Candidate team pool ─────────────────────────────────────────────────────
// All 35 teams from the brief's suggested pool ("N.Ireland" normalised to
// "Northern Ireland"). uefaCode is the app's flag key: it must match an entry
// in src/design-system/teamFlagRegistry.js, where the bundled circle-flags
// asset is resolved at build time (this repo does not use flag URLs).
// countryCode is ISO 3166-1 alpha-2; the four UK home nations have no own
// alpha-2 code (their subdivision codes don't fit the DB check) so stay null.
const CANDIDATE_TEAM_POOL = Object.freeze([
  { slug: 'albania', name: 'Albania', shortName: 'Albania', countryCode: 'AL', uefaCode: 'ALB' },
  { slug: 'austria', name: 'Austria', shortName: 'Austria', countryCode: 'AT', uefaCode: 'AUT' },
  { slug: 'belgium', name: 'Belgium', shortName: 'Belgium', countryCode: 'BE', uefaCode: 'BEL' },
  { slug: 'bosnia-and-herzegovina', name: 'Bosnia and Herzegovina', shortName: 'Bosnia', countryCode: 'BA', uefaCode: 'BIH' },
  { slug: 'croatia', name: 'Croatia', shortName: 'Croatia', countryCode: 'HR', uefaCode: 'CRO' },
  { slug: 'czech-republic', name: 'Czech Republic', shortName: 'Czechia', countryCode: 'CZ', uefaCode: 'CZE' },
  { slug: 'denmark', name: 'Denmark', shortName: 'Denmark', countryCode: 'DK', uefaCode: 'DEN' },
  { slug: 'england', name: 'England', shortName: 'England', countryCode: null, uefaCode: 'ENG' },
  { slug: 'finland', name: 'Finland', shortName: 'Finland', countryCode: 'FI', uefaCode: 'FIN' },
  { slug: 'france', name: 'France', shortName: 'France', countryCode: 'FR', uefaCode: 'FRA' },
  { slug: 'georgia', name: 'Georgia', shortName: 'Georgia', countryCode: 'GE', uefaCode: 'GEO' },
  { slug: 'germany', name: 'Germany', shortName: 'Germany', countryCode: 'DE', uefaCode: 'GER' },
  { slug: 'greece', name: 'Greece', shortName: 'Greece', countryCode: 'GR', uefaCode: 'GRE' },
  { slug: 'hungary', name: 'Hungary', shortName: 'Hungary', countryCode: 'HU', uefaCode: 'HUN' },
  { slug: 'iceland', name: 'Iceland', shortName: 'Iceland', countryCode: 'IS', uefaCode: 'ISL' },
  { slug: 'israel', name: 'Israel', shortName: 'Israel', countryCode: 'IL', uefaCode: 'ISR' },
  { slug: 'italy', name: 'Italy', shortName: 'Italy', countryCode: 'IT', uefaCode: 'ITA' },
  { slug: 'kosovo', name: 'Kosovo', shortName: 'Kosovo', countryCode: 'XK', uefaCode: 'KOS' },
  { slug: 'netherlands', name: 'Netherlands', shortName: 'Netherlands', countryCode: 'NL', uefaCode: 'NED' },
  { slug: 'northern-ireland', name: 'Northern Ireland', shortName: 'N. Ireland', countryCode: null, uefaCode: 'NIR' },
  { slug: 'norway', name: 'Norway', shortName: 'Norway', countryCode: 'NO', uefaCode: 'NOR' },
  { slug: 'poland', name: 'Poland', shortName: 'Poland', countryCode: 'PL', uefaCode: 'POL' },
  { slug: 'portugal', name: 'Portugal', shortName: 'Portugal', countryCode: 'PT', uefaCode: 'POR' },
  { slug: 'republic-of-ireland', name: 'Republic of Ireland', shortName: 'Ireland', countryCode: 'IE', uefaCode: 'IRL' },
  { slug: 'romania', name: 'Romania', shortName: 'Romania', countryCode: 'RO', uefaCode: 'ROU' },
  { slug: 'scotland', name: 'Scotland', shortName: 'Scotland', countryCode: null, uefaCode: 'SCO' },
  { slug: 'serbia', name: 'Serbia', shortName: 'Serbia', countryCode: 'RS', uefaCode: 'SRB' },
  { slug: 'slovakia', name: 'Slovakia', shortName: 'Slovakia', countryCode: 'SK', uefaCode: 'SVK' },
  { slug: 'slovenia', name: 'Slovenia', shortName: 'Slovenia', countryCode: 'SI', uefaCode: 'SVN' },
  { slug: 'spain', name: 'Spain', shortName: 'Spain', countryCode: 'ES', uefaCode: 'ESP' },
  { slug: 'sweden', name: 'Sweden', shortName: 'Sweden', countryCode: 'SE', uefaCode: 'SWE' },
  { slug: 'switzerland', name: 'Switzerland', shortName: 'Switzerland', countryCode: 'CH', uefaCode: 'SUI' },
  { slug: 'turkey', name: 'Turkey', shortName: 'Turkey', countryCode: 'TR', uefaCode: 'TUR' },
  { slug: 'ukraine', name: 'Ukraine', shortName: 'Ukraine', countryCode: 'UA', uefaCode: 'UKR' },
  { slug: 'wales', name: 'Wales', shortName: 'Wales', countryCode: null, uefaCode: 'WAL' },
])

// ── EDIT ME: slot assignments ───────────────────────────────────────────────
// Edit the mapping below to match your predicted draw, then run this script.
// Re-run any time to update assignments before the real draw locks.
//
// Every slot A1-F4 must name a slug from CANDIDATE_TEAM_POOL above, each slug
// at most once. Teams left out of the mapping stay in the pool, unattached,
// ready for a future re-run.
//
// The five UK & Ireland nations sit in the reserved group-head slots they hold
// for the Euro 2028 finals draw: Wales A1, England B1, Northern Ireland D1,
// Republic of Ireland E1, Scotland F1. Group C has no reserved nation. Slot
// membership is the only thing fixed here: which teams fill the remaining slots,
// and whether any of these five actually qualify, carries no official meaning.
//
// Two tiers hide behind those five reserved slots, and they are not the same:
//   - Wales, England, Republic of Ireland and Scotland are the genuine co-hosts.
//     They hold the reserved slot AND the host safety net: two places are kept
//     back for the best-placed hosts that fail to qualify through the groups.
//   - Northern Ireland holds the reserved D1 slot but is NOT a co-host — it lost
//     host status in 2024. No safety-net place, and no home venue: were it to
//     qualify by the normal route it would play its group matches in England.
// Nothing in this script encodes that difference; it is recorded here because
// the slot mapping alone makes the five nations look interchangeable, and they
// are not. The qualification asymmetry lives in the curated Team Guide text in
// scripts/assign-team-profiles.mjs.
const SLOT_ASSIGNMENTS = Object.freeze({
  A1: 'wales',
  A2: 'germany',
  A3: 'hungary',
  A4: 'switzerland',
  B1: 'england',
  B2: 'france',
  B3: 'austria',
  B4: 'ukraine',
  // Netherlands heads Group C, displaced from F1 by Scotland's reserved slot.
  C1: 'netherlands',
  C2: 'spain',
  C3: 'croatia',
  C4: 'albania',
  D1: 'northern-ireland',
  D2: 'italy',
  D3: 'denmark',
  D4: 'georgia',
  E1: 'republic-of-ireland',
  E2: 'portugal',
  E3: 'poland',
  E4: 'slovenia',
  F1: 'scotland',
  F2: 'belgium',
  F3: 'turkey',
  F4: 'czech-republic',
})

// ── Validation ──────────────────────────────────────────────────────────────
const EXPECTED_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F']
  .flatMap(group => [1, 2, 3, 4].map(position => `${group}${position}`))

function validate() {
  const poolSlugs = new Set(CANDIDATE_TEAM_POOL.map(team => team.slug))
  if (poolSlugs.size !== CANDIDATE_TEAM_POOL.length) {
    throw new Error('CANDIDATE_TEAM_POOL contains a duplicate slug')
  }
  const uefaCodes = new Set(CANDIDATE_TEAM_POOL.map(team => team.uefaCode))
  if (uefaCodes.size !== CANDIDATE_TEAM_POOL.length) {
    throw new Error('CANDIDATE_TEAM_POOL contains a duplicate uefaCode')
  }

  const slots = Object.keys(SLOT_ASSIGNMENTS)
  if (slots.length !== 24 || EXPECTED_SLOTS.some(slot => !SLOT_ASSIGNMENTS[slot])) {
    throw new Error(`SLOT_ASSIGNMENTS must cover exactly the 24 slots ${EXPECTED_SLOTS[0]}-${EXPECTED_SLOTS[23]}`)
  }
  const assignedSlugs = Object.values(SLOT_ASSIGNMENTS)
  const unknown = assignedSlugs.filter(slug => !poolSlugs.has(slug))
  if (unknown.length > 0) {
    throw new Error(`SLOT_ASSIGNMENTS names slugs missing from the pool: ${unknown.join(', ')}`)
  }
  const duplicates = assignedSlugs.filter((slug, index) => assignedSlugs.indexOf(slug) !== index)
  if (duplicates.length > 0) {
    throw new Error(`SLOT_ASSIGNMENTS assigns the same team to two slots: ${[...new Set(duplicates)].join(', ')}`)
  }
}

// ── SQL generation ──────────────────────────────────────────────────────────
const sqlText = value => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`)

function buildSql() {
  const teamRows = CANDIDATE_TEAM_POOL.map(team =>
    `  (${sqlText(team.slug)}, ${sqlText(team.name)}, ${sqlText(team.shortName)}, ${sqlText(team.countryCode)}, ${sqlText(team.uefaCode)})`,
  ).join(',\n')

  const assignmentRows = EXPECTED_SLOTS.map(slot =>
    `    (${sqlText(slot)}, ${sqlText(SLOT_ASSIGNMENTS[slot])})`,
  ).join(',\n')

  return `-- Generated by scripts/assign-candidate-teams.mjs. Do not hand-edit this SQL;
-- edit the SLOT_ASSIGNMENTS mapping in the script and regenerate instead.
--
-- Candidate teams are testing/admin data. They are not confirmed Euro 2028
-- qualifiers; every slot stays provisional until the real draw.

begin;

-- Seed / refresh the candidate team pool (idempotent upsert on slug).
insert into public.teams (slug, name, short_name, country_code, uefa_code)
values
${teamRows}
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  country_code = excluded.country_code,
  uefa_code = excluded.uefa_code,
  is_active = true,
  updated_at = now();

-- Clear all 24 Euro 2028 slot assignments first so re-runs that swap teams
-- between slots never trip the unique (tournament_id, team_id) constraint.
update public.tournament_teams
set team_id = null, updated_at = now()
where tournament_id = (select id from public.tournaments where code = 'euro-2028');

-- Assign the mapped team to each slot. Display identity flows through the
-- metadata jsonb (label/shortLabel/isoCode); qualification_status and
-- is_provisional are deliberately not touched.
update public.tournament_teams tournament_team
set
  team_id = team.id,
  metadata = tournament_team.metadata || jsonb_build_object(
    'label', team.name,
    'shortLabel', team.short_name,
    'isoCode', team.uefa_code
  ),
  updated_at = now()
from (
  values
${assignmentRows}
) as assignment(slot_code, team_slug)
join public.teams team on team.slug = assignment.team_slug
where tournament_team.tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and tournament_team.slot_code = assignment.slot_code;

-- Fail the whole transaction loudly if the result is not exactly right.
do $verify$
declare
  euro_tournament_id uuid := (select id from public.tournaments where code = 'euro-2028');
  assigned_count integer;
  flag_violations integer;
begin
  select count(*) into assigned_count
  from public.tournament_teams
  where tournament_id = euro_tournament_id and team_id is not null;
  if assigned_count <> 24 then
    raise exception 'Expected 24 assigned slots, found % -- check the mapping slugs', assigned_count;
  end if;

  select count(*) into flag_violations
  from public.tournament_teams
  where tournament_id = euro_tournament_id
    and (is_provisional = false or qualification_status <> 'provisional');
  if flag_violations > 0 then
    raise exception 'Provisional flags must stay untouched; % rows differ', flag_violations;
  end if;
end
$verify$;

commit;
`
}

// ── Entry point (mirrors scripts/generate-staging-admin-sql.mjs) ────────────
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
    console.log('Candidate team assignment SQL generated.')
    console.log(`Output: ${outputPath}`)
    console.log('Review the file, then apply it with psql or the Supabase SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
