#!/usr/bin/env node
// Team Profile population (bulk, editable, idempotent): colours + curated Team
// Guide facts.
//
// Edit the TEAM_PROFILE_COLOURS and TEAM_PROFILE_CONTENT maps below — one entry
// per team — then run this script to generate SQL that writes both into Supabase.
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
// SELF-HEALING AGAINST DRAW RESHUFFLES. Profile rows and colour keys are keyed by
// SLOT (tournament_team_id), not by team, so when assign-candidate-teams.mjs moves
// a team to a different slot its Team Guide and colours stay behind and attach to
// whichever team takes the old slot. The generated SQL now strips that stranded
// data before writing, and asserts afterwards that none remains. Run this script
// after any slot reassignment; order no longer matters, it converges either way.
//
// CURATED CONTENT WRITES BYPASS THE ADMIN AUDIT TRAIL. The Team Guide facts in
// TEAM_PROFILE_CONTENT are upserted straight into public.tournament_team_profiles.
// The interactive path (Admin → Team Profiles → the admin_upsert_team_profile RPC)
// records updated_by_user_id and an operation event; this script does neither, and
// re-running OVERWRITES whatever an admin last saved for the teams listed below,
// bumping profile_revision. Use this for bulk/seed population and refreshes; use
// the admin screen for one-off owner edits you want attributed and audited.
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
// HOW THE CURATED FACTS REACH THE UI:
//   1. This script upserts public.tournament_team_profiles (ranking,
//      qualifying_route, best_euro_finish, editorial_note).
//   2. The get_team_profile_sheet RPC reports curated.status = 'ready' as soon as
//      a row exists, and returns those four columns.
//   3. teamProfileModel.normaliseTeamProfilePayload maps them onto profile.curated.
//   4. TeamProfileSheet's CuratedFacts renders the "Team guide" section; without a
//      row it renders the "Profile details not added yet" empty state instead.
// The four columns above are the ONLY curated fields the Team Guide reads. There is
// deliberately no manager field anywhere in this schema.

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

// ── EDIT ME: per-team curated Team Guide facts ──────────────────────────────
// slug → { ranking, qualifyingRoute, bestEuroFinish, editorialNote } | null
//
// Current as of July 2026 — ranking and qualifying status will need refreshing as
// the campaign progresses. These are LIVING values, not one-time constants: FIFA
// republishes the ranking roughly monthly (the figure below is the official list
// of 11 June 2026; the next was due 20 July 2026), and the Euro 2028 qualifying
// story changes at the 6 December 2026 draw and again once matches begin in March
// 2027. Re-run this script whenever they move.
//
// Field limits mirror the CHECK constraints on public.tournament_team_profiles
// (migration 202607020015): ranking 1–300, qualifyingRoute 2–180 chars,
// bestEuroFinish 2–120, editorialNote 10–700. validate() enforces them here so a
// bad edit fails before any SQL is generated.
const TEAM_PROFILE_CONTENT = Object.freeze({
  // Sources: FIFA/Coca-Cola Men's World Ranking (inside.fifa.com, list of 11 June
  // 2026, incl. the all-time high/low); UEFA's approved Euro 2028 qualification
  // system (hosts must qualify, two reserved places, draw 6 Dec 2026 in Belfast);
  // UEFA Euro 2028 finals allocation (Scotland reserved as F1, all three group
  // games at Hampden Park, contingent on qualifying); 2026 World Cup Group C.
  //
  // Deliberately no manager: Steve Clarke resigned immediately after the 2026
  // World Cup exit and no successor is confirmed. The schema has no manager field.
  scotland: {
    ranking: 42,
    qualifyingRoute: 'Co-host, but not automatically qualified: enters the normal qualifying groups, with two places reserved for the best-placed hosts. Draw 6 Dec 2026, first matches Mar 2027.',
    bestEuroFinish: 'Group stage — never progressed beyond it (1992, 1996, 2020, 2024).',
    editorialNote: 'FIFA ranking peaked at 13th (October 2007) and bottomed out at 88th (March 2005). Euro 2020 ended a 22-year absence from major tournaments; Euro 2024 brought another group-stage exit, bottom of a group containing Germany, Switzerland and Hungary. Scotland then reached the 2026 World Cup — their first since 1998 — beating Haiti 1-0 for their first World Cup win since 1990, before going out at the group stage. As a co-host, Scotland holds the reserved Group F top position in the Euro 2028 finals draw and would play all three group games at Hampden Park, but only if they qualify.',
  },

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

// Mirrors the CHECK constraints on public.tournament_team_profiles so an edit that
// the database would reject fails here, before any SQL is written.
const CONTENT_TEXT_LIMITS = Object.freeze({
  qualifyingRoute: [2, 180],
  bestEuroFinish: [2, 120],
  editorialNote: [10, 700],
})

function filledEntries() {
  return Object.entries(TEAM_PROFILE_COLOURS).filter(([, colours]) => colours != null)
}

function filledContentEntries() {
  return Object.entries(TEAM_PROFILE_CONTENT).filter(([, content]) => content != null)
}

function validateContent() {
  for (const [slug, content] of filledContentEntries()) {
    const { ranking } = content
    if (!Number.isInteger(ranking) || ranking < 1 || ranking > 300) {
      throw new Error(`${slug}: ranking must be an integer between 1 and 300, got ${ranking}`)
    }
    for (const [field, [min, max]] of Object.entries(CONTENT_TEXT_LIMITS)) {
      const value = content[field]
      if (typeof value !== 'string' || value.length < min || value.length > max) {
        throw new Error(`${slug}: ${field} must be a string of ${min}-${max} characters, got ${typeof value === 'string' ? `${value.length} characters` : typeof value}`)
      }
    }
    for (const key of Object.keys(content)) {
      if (key !== 'ranking' && !(key in CONTENT_TEXT_LIMITS)) {
        throw new Error(`${slug}: unknown curated field "${key}" — the Team Guide reads ranking, ${Object.keys(CONTENT_TEXT_LIMITS).join(', ')} only`)
      }
    }
  }
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
  validateContent()
}

// ── SQL generation ──────────────────────────────────────────────────────────
const sqlText = value => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`)
const sqlSlugArray = slugs => `array[${slugs.map(sqlText).join(', ')}]::text[]`

// Reconciliation: strip data stranded on the wrong slot by a draw reshuffle.
//
// Both tournament_team_profiles (primary key tournament_id, tournament_team_id)
// and the colour keys in tournament_teams.metadata are keyed by SLOT, not by
// team. Neither follows team_id. So when scripts/assign-candidate-teams.mjs moves
// a team to a different slot, that team's curated row and colours stay behind on
// the old slot and silently attach to whichever team moves in — the old slot now
// renders another nation's ranking, editorial note and accent colour.
//
// Every write below is scoped to "the slot this team currently occupies", so the
// writes alone cannot undo that: they populate the new slot and leave the stale
// data sitting on the old one. This step removes it first, making the script
// converge on the correct end state no matter what order slot changes and profile
// writes happened in.
//
// Two teams that both appear in the maps swapping slots needs no deletion: each
// slot's occupant is still a recipient, and the upserts below rewrite each slot
// with its current occupant's data. Only slots whose occupant is NOT a recipient
// (or which sit empty) can hold data that no write will ever correct.
//
// WHAT IS DELIBERATELY NOT TOUCHED. A curated row with a non-null
// updated_by_user_id came from the audited admin_upsert_team_profile RPC, which
// sets it to auth.uid() and raises when unauthenticated. This script never sets
// it. So `updated_by_user_id is null` identifies precisely the rows this script
// wrote, and an owner's admin-entered profile for a team absent from the maps is
// preserved. Colours have no such ambiguity: nothing but this script ever writes
// metadata.primaryColour / metadata.secondaryColour (the app only reads them).
function buildReconcileSql() {
  const colourSlugs = filledEntries().map(([slug]) => slug)
  const contentSlugs = filledContentEntries().map(([slug]) => slug)

  // With an empty content map the script claims no ownership of any curated row,
  // so it must not delete any. Emptying the map is an explicit opt-out, not a
  // reshuffle. validate() already guarantees at least one colour entry.
  const contentReconcile = contentSlugs.length === 0 ? '' : `
-- Curated rows this script wrote (updated_by_user_id is null) that are stranded on
-- a slot whose current team is not a curated-content recipient. Admin-entered rows
-- (updated_by_user_id set) are never deleted, even when stranded.
delete from public.tournament_team_profiles profile
using public.tournament_teams tournament_team
where profile.tournament_team_id = tournament_team.id
  and profile.tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and profile.updated_by_user_id is null
  and not exists (
    select 1
    from public.teams team
    where team.id = tournament_team.team_id
      and team.slug = any (${sqlSlugArray(contentSlugs)})
  );
`

  return `${contentReconcile}
-- Colour keys stranded on a slot whose current team is not a colour recipient,
-- including slots left empty by a reshuffle. Only these two keys are removed; all
-- other metadata (label/shortLabel/isoCode, draw_slot kind) is preserved.
update public.tournament_teams tournament_team
set
  metadata = tournament_team.metadata - 'primaryColour' - 'secondaryColour',
  updated_at = now()
where tournament_team.tournament_id = (select id from public.tournaments where code = 'euro-2028')
  and (tournament_team.metadata ? 'primaryColour' or tournament_team.metadata ? 'secondaryColour')
  and not exists (
    select 1
    from public.teams team
    where team.id = tournament_team.team_id
      and team.slug = any (${sqlSlugArray(colourSlugs)})
  );
`
}

function buildContentSql() {
  if (filledContentEntries().length === 0) return ''

  const rows = filledContentEntries().map(([slug, content]) => `    (${sqlText(slug)}, ${content.ranking}, ${sqlText(content.qualifyingRoute)}, ${sqlText(content.bestEuroFinish)}, ${sqlText(content.editorialNote)})`).join(',\n')

  return `
-- Upsert curated Team Guide facts. These are the only four curated columns the
-- Team Profile sheet reads; a row existing at all is what flips curated.status
-- from 'empty' to 'ready'. Overwrites admin-entered values for these teams and
-- bumps profile_revision, so the next audited admin save still sees a fresh
-- revision rather than a stale one.
insert into public.tournament_team_profiles as profile (
  tournament_id, tournament_team_id, ranking, qualifying_route, best_euro_finish, editorial_note
)
select
  tournament_team.tournament_id,
  tournament_team.id,
  content.ranking::integer,
  content.qualifying_route::text,
  content.best_euro_finish::text,
  content.editorial_note::text
from (
  values
${rows}
) as content(team_slug, ranking, qualifying_route, best_euro_finish, editorial_note)
join public.teams team on team.slug = content.team_slug
join public.tournament_teams tournament_team
  on tournament_team.team_id = team.id
 and tournament_team.tournament_id = (select id from public.tournaments where code = 'euro-2028')
on conflict (tournament_id, tournament_team_id) do update set
  ranking = excluded.ranking,
  qualifying_route = excluded.qualifying_route,
  best_euro_finish = excluded.best_euro_finish,
  editorial_note = excluded.editorial_note,
  profile_revision = profile.profile_revision + 1,
  updated_at = now();
`
}

function buildSql() {
  const rows = filledEntries().map(([slug, colours]) => {
    const object = colours.secondaryColour == null
      ? `jsonb_build_object('primaryColour', ${sqlText(colours.primaryColour)})`
      : `jsonb_build_object('primaryColour', ${sqlText(colours.primaryColour)}, 'secondaryColour', ${sqlText(colours.secondaryColour)})`
    return `    (${sqlText(slug)}, ${object})`
  }).join(',\n')

  // Every team named in either map must actually be assigned to a slot.
  const filledSlugs = [...new Set([...filledEntries(), ...filledContentEntries()].map(([slug]) => slug))]
  const colourSlugs = filledEntries().map(([slug]) => slug)
  const contentSlugs = filledContentEntries().map(([slug]) => slug)

  return `-- Generated by scripts/assign-team-profiles.mjs. Do not hand-edit this SQL;
-- edit the TEAM_PROFILE_COLOURS / TEAM_PROFILE_CONTENT maps in the script and
-- regenerate instead.
--
-- Idempotent AND self-healing: first strips profile rows and colour keys stranded
-- on the wrong slot by a draw reshuffle, then merges colour keys into
-- tournament_teams.metadata and upserts the curated Team Guide row in
-- tournament_team_profiles, for the mapped teams only. Re-runnable in any order
-- relative to scripts/assign-candidate-teams.mjs; leaves all other metadata,
-- columns and admin-entered profiles untouched.
--
-- The curated upsert bypasses the audited admin_upsert_team_profile RPC: it records
-- no updated_by_user_id and no operation event. See the script header.

begin;
${buildReconcileSql()}
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
${buildContentSql()}
-- Fail loudly if any filled-in team is not currently assigned to a slot, so a
-- typo or an un-seeded team never silently writes nothing; and if any script-owned
-- profile row or colour key is left attached to a team it does not belong to.
--
-- That second assertion is the one this script previously lacked. A reshuffle that
-- stranded Scotland's Team Guide on Wales satisfied every check here and reported
-- success. It no longer can.
do $verify$
declare
  euro_tournament_id uuid := (select id from public.tournaments where code = 'euro-2028');
  expected_slugs text[] := array[${filledSlugs.map(sqlText).join(', ')}];
  colour_slugs text[] := ${sqlSlugArray(colourSlugs)};
  content_slugs text[] := ${sqlSlugArray(contentSlugs)};
  missing_count integer;
  stranded_colours integer;
  stranded_profiles integer;
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
    raise exception 'Team profile population expected % teams to be assigned; % are not (check slugs / run assign-candidate-teams first)', array_length(expected_slugs, 1), missing_count;
  end if;

  select count(*) into stranded_colours
  from public.tournament_teams tournament_team
  where tournament_team.tournament_id = euro_tournament_id
    and (tournament_team.metadata ? 'primaryColour' or tournament_team.metadata ? 'secondaryColour')
    and not exists (
      select 1 from public.teams team
      where team.id = tournament_team.team_id and team.slug = any (colour_slugs)
    );
  if stranded_colours > 0 then
    raise exception 'Reconciliation failed: % slot(s) still carry colours for a team that does not own them', stranded_colours;
  end if;

  if array_length(content_slugs, 1) is not null then
    select count(*) into stranded_profiles
    from public.tournament_team_profiles profile
    join public.tournament_teams tournament_team on tournament_team.id = profile.tournament_team_id
    where profile.tournament_id = euro_tournament_id
      and profile.updated_by_user_id is null
      and not exists (
        select 1 from public.teams team
        where team.id = tournament_team.team_id and team.slug = any (content_slugs)
      );
    if stranded_profiles > 0 then
      raise exception 'Reconciliation failed: % script-written profile row(s) still attached to a team that does not own them', stranded_profiles;
    end if;
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
    console.log('Team profile SQL generated (colours + curated Team Guide facts).')
    console.log(`Output: ${outputPath}`)
    console.log(`Colours filled in: ${filledEntries().map(([slug]) => slug).join(', ') || '(none)'}`)
    console.log(`Curated facts filled in: ${filledContentEntries().map(([slug]) => slug).join(', ') || '(none)'}`)
    console.log('Review the file, then apply it with psql or the Supabase SQL Editor.')
  } else {
    process.stdout.write(sql)
  }
} catch (error) {
  console.error(`STOP: ${error.message}`)
  process.exitCode = 1
}
