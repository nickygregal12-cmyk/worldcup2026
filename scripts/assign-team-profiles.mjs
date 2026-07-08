#!/usr/bin/env node
// Team Profile colour population (bulk, editable, idempotent).
//
// Edit the TEAM_PROFILE_COLOURS map below — one entry per team — then run this
// script to generate SQL that writes each team's colours into Supabase.
//
//   node scripts/assign-team-profiles.mjs                 # SQL to stdout
//   node scripts/assign-team-profiles.mjs --output out.sql
//
// Apply the generated SQL to the target database (local: psql inside the
// supabase_db container; staging: Supabase SQL Editor). The SQL is idempotent:
// it MERGES colour keys into tournament_teams.metadata (jsonb) keyed by team
// slug, so re-running only refreshes colours and never disturbs other metadata
// (label/shortLabel/isoCode set by scripts/assign-candidate-teams.mjs) or any
// other column. Re-run any time as more teams are filled in.
//
// HOW THE COLOUR REACHES THE UI (no migration, no hardcoded per-team data):
//   1. This script writes metadata.primaryColour / metadata.secondaryColour.
//   2. loadEuroApp already selects tournament_teams.metadata; guestReferenceModel
//      .normaliseTeam exposes primaryColour / secondaryColour on the reference team.
//   3. teamProfileModel.normaliseTeamProfilePayload carries them onto profile.team,
//      and buildTeamColourTreatment() derives a contrast-safe ink.
//   4. TeamProfileSheet applies them as inline style (accent bar + tint + monogram).
//   Nothing about a specific team lives in JSX/JS — the values come only from here.
//
// TO FILL IN THE REMAINING TEAMS: add a { primaryColour, secondaryColour } for
// each slug below (slugs match scripts/assign-candidate-teams.mjs) and re-run.
// Entries left null are skipped, so this script is safe to run at any stage of
// completion. Colours are #RRGGBB hex; secondaryColour may be null.
//
// Curated objective facts (FIFA ranking, qualifying route, best Euro finish,
// editorial note) are NOT colours and are deliberately out of scope here: they
// live in tournament_team_profiles and stay owner-entered via AdminTeamProfiles
// (the audited save_team_profile RPC). This script owns colours only.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// ── EDIT ME: per-team colours ───────────────────────────────────────────────
// slug → { primaryColour, secondaryColour } | null   (null = not filled in yet)
// Use real, accessible national colours. Do not use the retired WC26 blues
// (#003087, #00206b, #005eb8). primaryColour is the shirt/flag base used for the
// accent + monogram; secondaryColour is the trim swatch (may be null).
const TEAM_PROFILE_COLOURS = Object.freeze({
  // Scotland — navy blue and white, reflecting the Saltire. Navy chosen as a
  // reasonable, accessible value (white text contrast ≈ 8.9:1); not brand-locked.
  scotland: { primaryColour: '#1B3A6B', secondaryColour: '#FFFFFF' },

  albania: null,
  austria: null,
  belgium: null,
  croatia: null,
  'czech-republic': null,
  denmark: null,
  england: null,
  france: null,
  georgia: null,
  germany: null,
  hungary: null,
  italy: null,
  netherlands: null,
  'northern-ireland': null,
  poland: null,
  portugal: null,
  'republic-of-ireland': null,
  slovenia: null,
  spain: null,
  switzerland: null,
  turkey: null,
  ukraine: null,
  wales: null,
})

// ── Validation ──────────────────────────────────────────────────────────────
const HEX = /^#[0-9a-fA-F]{6}$/
const RETIRED = new Set(['#003087', '#00206b', '#005eb8'])

function filledEntries() {
  return Object.entries(TEAM_PROFILE_COLOURS).filter(([, colours]) => colours != null)
}

function validate() {
  for (const [slug, colours] of filledEntries()) {
    if (!HEX.test(colours.primaryColour ?? '')) {
      throw new Error(`${slug}: primaryColour must be #RRGGBB hex, got ${colours.primaryColour}`)
    }
    if (colours.secondaryColour != null && !HEX.test(colours.secondaryColour)) {
      throw new Error(`${slug}: secondaryColour must be #RRGGBB hex or null, got ${colours.secondaryColour}`)
    }
    for (const value of [colours.primaryColour, colours.secondaryColour]) {
      if (value && RETIRED.has(value.toLowerCase())) {
        throw new Error(`${slug}: ${value} is a retired WC26 colour; choose a current value`)
      }
    }
  }
  if (filledEntries().length === 0) {
    throw new Error('No team colours are filled in; add at least one entry before running')
  }
}

// ── SQL generation ──────────────────────────────────────────────────────────
const sqlText = value => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`)

function buildSql() {
  const rows = filledEntries().map(([slug, colours]) => {
    const object = colours.secondaryColour == null
      ? `jsonb_build_object('primaryColour', ${sqlText(colours.primaryColour)})`
      : `jsonb_build_object('primaryColour', ${sqlText(colours.primaryColour)}, 'secondaryColour', ${sqlText(colours.secondaryColour)})`
    return `    (${sqlText(slug)}, ${object})`
  }).join(',\n')

  const filledSlugs = filledEntries().map(([slug]) => slug)

  return `-- Generated by scripts/assign-team-profiles.mjs. Do not hand-edit this SQL;
-- edit the TEAM_PROFILE_COLOURS map in the script and regenerate instead.
--
-- Idempotent: merges colour keys into tournament_teams.metadata for the mapped
-- teams only. Re-runnable; leaves all other metadata and columns untouched.

begin;

-- Merge each filled-in team's colours into its tournament_teams.metadata.
update public.tournament_teams tournament_team
set
  metadata = tournament_team.metadata || assignment.colours,
  updated_at = now()
from (
  values
${rows}
) as assignment(team_slug, colours)
join public.teams team on team.slug = assignment.team_slug
where tournament_team.tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and tournament_team.team_id = team.id;

-- Fail loudly if any filled-in team is not currently assigned to a slot, so a
-- typo or an un-seeded team never silently writes nothing.
do $verify$
declare
  euro_tournament_id uuid := (select id from public.tournaments where code = 'euro-2028');
  expected_slugs text[] := array[${filledSlugs.map(sqlText).join(', ')}];
  missing_count integer;
begin
  select count(*) into missing_count
  from unnest(expected_slugs) as wanted(slug)
  where not exists (
    select 1
    from public.tournament_teams tournament_team
    join public.teams team on team.id = tournament_team.team_id
    where tournament_team.tournament_id = euro_tournament_id
      and team.slug = wanted.slug
  );
  if missing_count > 0 then
    raise exception 'Colour population expected % teams to be assigned; % are not (check slugs / run assign-candidate-teams first)', array_length(expected_slugs, 1), missing_count;
  end if;
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
    console.log('Team profile colour SQL generated.')
    console.log(`Output: ${outputPath}`)
    console.log(`Teams filled in: ${filledEntries().map(([slug]) => slug).join(', ')}`)
    console.log('Review the file, then apply it with psql or the Supabase SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
