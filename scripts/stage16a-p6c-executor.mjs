// Stage 16A-P6C — Seed write executor (first write-capable slice).
//
// Implements the eight executor modules prepared (but blocked) in P6B:
//   context_guard, synthetic_user_writer, provisional_team_writer,
//   prediction_seed_writer, league_seed_writer, seed_validator,
//   synthetic_teardown, reseed_validator
// plus the owner-approved P6C extension: a fake clock that DERIVES match
// state (scheduled / live / final synthetic score) from an arbitrary time T
// and runs the EXISTING DB scoring engine against synthetic predictions.
//
// Safety: fail-closed context guard, dual-marker synthetic-only writes,
// exact P5 teardown confirmation, zero-residue teardown. LOCAL Docker only
// in this session — never targets real Euro staging or WC26 production.
//
// It reuses the frozen constants from the prior stages' models — it does not
// redefine the contract. It calls the existing scoring/resolver DB functions;
// it does not reimplement scoring or resolver logic.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'
import {
  EURO28_STAGING_PROJECT_REF,
  WC26_PRODUCTION_PROJECT_REF,
  STAGE16A_SYNTHETIC_EMAIL_DOMAIN,
  STAGE16A_SYNTHETIC_PERSONAS,
} from './lib/stage16aSyntheticIdentity.mjs'
import {
  STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS,
  STAGE16A_P5_TEARDOWN_CONFIRMATION,
} from './lib/stage16aSeedWritePreflight.mjs'
import {
  STAGE16A_P6A_ALLOWED_BRANCH,
  STAGE16A_P6A_BLOCKED_BRANCHES,
  STAGE16A_P6A_ZERO_RESIDUE_TARGETS,
} from './lib/stage16aSeedWriteAcceptancePlan.mjs'

// ---- Frozen environment facts (LOCAL) --------------------------------------
const TOURNAMENT_ID = 'e0280000-0000-4000-8000-000000000001'
const RULESET_ID = 'e0285000-0000-4000-8000-000000000001'
const CONTRACT_VERSION = 'euro28-prediction-db-v2'
const LOCAL_DB_CONTAINER = process.env.STAGE16A_LOCAL_DB_CONTAINER || 'supabase_db_euro28predictor'
const REAL_NOW_SENTINEL = 'real-now'

// Group matches carry normal-time results; a plausible group match lasts ~115
// minutes wall-clock (kickoff → full time incl. half-time and stoppage).
const GROUP_MATCH_DURATION_MIN = 115
// Deterministic kickoff times of day (UTC) assigned by match slot in a day.
const KICKOFF_HOURS_UTC = [13, 16, 19]

// ---- Small deterministic PRNG (stable scores for a given match) ------------
function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Deterministic, plausible football scoreline for a match number.
// Same match number always yields the same score (idempotent screenshots).
function syntheticScore(matchNumber) {
  const seed = hash32(`euro28-synthetic-result-v1:${matchNumber}`)
  // Weighted toward realistic low scores: 0..4, biased low.
  const table = [0, 0, 1, 1, 1, 2, 2, 3, 4]
  const home = table[seed % table.length]
  const away = table[Math.floor(seed / 16) % table.length]
  return { home, away }
}

// ---- DB adapter (LOCAL: superuser psql inside the container) ----------------
// PostgREST/service-role cannot reach the private schema or private functions,
// so LOCAL privileged work runs through the container's postgres superuser.
function runSql(sql, { rows = false } = {}) {
  const args = ['exec', '-i', LOCAL_DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '--no-align', '--tuples-only', '--field-separator=\t', '--quiet']
  try {
    const out = execFileSync('docker', args, { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (!rows) return out
    return out.split('\n').filter(line => line.length > 0).map(line => line.split('\t'))
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : ''
    throw new Error(`SQL failed: ${stderr || error.message}`)
  }
}
function scalar(sql) {
  const r = runSql(sql, { rows: true })
  return r.length ? r[0][0] : null
}
function q(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

// ---- context_guard ----------------------------------------------------------
// Refuse unsafe branch / project / flags BEFORE any write. Fail-closed.
function currentBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}
function assertContext({ requireWriteFlags = true, requireTeardownConfirmation = false } = {}) {
  const errors = []
  const target = process.env.STAGE16A_TARGET || 'local'

  // Branch
  const branch = currentBranch()
  if (STAGE16A_P6A_BLOCKED_BRANCHES.includes(branch)) errors.push(`blocked branch: ${branch}`)
  else if (branch !== STAGE16A_P6A_ALLOWED_BRANCH) errors.push(`branch must be ${STAGE16A_P6A_ALLOWED_BRANCH}, got ${branch || '(unknown)'}`)

  // Project boundary — always fail-closed against WC26 production.
  const url = (process.env.SUPABASE_URL || '').toLowerCase()
  if (url.includes(WC26_PRODUCTION_PROJECT_REF)) errors.push('WC26 production project is blocked')

  if (target === 'staging') {
    if (!url.includes(EURO28_STAGING_PROJECT_REF)) errors.push(`staging target requires Euro staging ref ${EURO28_STAGING_PROJECT_REF}`)
  } else if (target === 'local') {
    const isLocal = /(^|\/\/)(127\.0\.0\.1|localhost)(:|\/|$)/.test(url) || url === ''
    if (!isLocal) errors.push(`local target requires a localhost SUPABASE_URL, got ${url || '(unset)'}`)
    if (url.includes(EURO28_STAGING_PROJECT_REF) || url.includes(WC26_PRODUCTION_PROJECT_REF)) {
      errors.push('local target must not point at a remote Supabase project')
    }
  } else {
    errors.push(`unknown STAGE16A_TARGET: ${target}`)
  }

  // Required local env names present (values never read/printed here).
  for (const key of STAGE16A_P5_REQUIRED_LOCAL_ENV_KEYS) {
    if (!(key in process.env) || String(process.env[key]).length === 0) errors.push(`missing required env: ${key}`)
  }

  if (requireWriteFlags) {
    if (process.env.STAGE16A_ALLOW_STAGING_SEED_WRITE !== 'true') errors.push('STAGE16A_ALLOW_STAGING_SEED_WRITE must be exactly "true"')
  }
  if (requireTeardownConfirmation) {
    if (process.env.STAGE16A_SEED_TEARDOWN_CONFIRMATION !== STAGE16A_P5_TEARDOWN_CONFIRMATION) {
      errors.push('STAGE16A_SEED_TEARDOWN_CONFIRMATION does not match the required phrase')
    }
  }

  if (errors.length) {
    throw new Error(`context_guard refused:\n  - ${errors.join('\n  - ')}`)
  }
  return { target, branch }
}

// ---- Backup precondition ----------------------------------------------------
// A write must not run without a fresh, checksum-verified backup of the target.
// Reuses the repo backup layout (metadata.json + SHA256SUMS.txt under a dated
// dir in EURO28_BACKUP_ROOT). Staging uses `npm run db:backup && db:backup:verify`;
// LOCAL uses a local dump verified the same way (never touches staging).
function requireFreshBackup() {
  if (process.env.STAGE16A_SKIP_BACKUP_PRECONDITION === 'i-accept-the-risk') return { skipped: true }
  const root = process.env.EURO28_BACKUP_ROOT
  if (!root || !fs.existsSync(root)) throw new Error(`backup precondition: EURO28_BACKUP_ROOT missing or unset (${root || 'unset'})`)
  const dirs = fs.readdirSync(root).map(name => path.join(root, name))
    .filter(p => fs.existsSync(path.join(p, 'SHA256SUMS.txt')) && fs.existsSync(path.join(p, 'metadata.json')))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  if (!dirs.length) throw new Error(`backup precondition: no verified backup (metadata.json + SHA256SUMS.txt) under ${root}`)
  const dir = dirs[0]
  const maxAgeMin = Number(process.env.STAGE16A_BACKUP_MAX_AGE_MIN || 360)
  const ageMin = (Date.now() - fs.statSync(path.join(dir, 'metadata.json')).mtimeMs) / 60000
  if (ageMin > maxAgeMin) throw new Error(`backup precondition: newest backup is ${Math.round(ageMin)}m old (> ${maxAgeMin}m)`)
  // Re-verify checksums (self-contained integrity check).
  const sums = fs.readFileSync(path.join(dir, 'SHA256SUMS.txt'), 'utf8').trim().split('\n').filter(Boolean)
  for (const line of sums) {
    const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/)
    if (!m) throw new Error(`backup precondition: bad checksum line: ${line}`)
    const file = path.join(dir, m[2])
    if (!fs.existsSync(file)) throw new Error(`backup precondition: missing backed-up file ${m[2]}`)
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    if (actual !== m[1]) throw new Error(`backup precondition: checksum mismatch for ${m[2]}`)
  }
  return { dir, ageMin: Math.round(ageMin), files: sums.length }
}

// ---- Synthetic selectors (dual-marker) -------------------------------------
const SYNTH_USER_SELECT = `
  select id from auth.users
  where email like '%@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}'
    and (raw_user_meta_data->>'synthetic_euro28') = 'true'`

// ---- synthetic_user_writer --------------------------------------------------
function seedUsers() {
  for (const persona of STAGE16A_SYNTHETIC_PERSONAS) {
    // Profile display name must be 3–30 chars, canonical and unique. The full
    // "Synthetic <Name>" persona label overflows 30 chars, so use a compact,
    // distinctive, unique per-persona display name.
    const displayName = `Syn16A ${persona.key}`
    const meta = JSON.stringify({ synthetic_euro28: true, stage: '16A', persona_key: persona.key, display_name: displayName })
    // Insert auth user (idempotent on email; auth.users email uniqueness is a
    // partial index, not a plain constraint, so guard with NOT EXISTS). The
    // profile row is created by the existing handle_new_euro_user_profile
    // trigger from raw_user_meta_data.
    runSql(`
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        ${q(persona.email)}, crypt('synthetic-not-a-real-login', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, ${q(meta)}::jsonb, now(), now()
      where not exists (select 1 from auth.users where email = ${q(persona.email)});`)
  }
}

// ---- Read helpers -----------------------------------------------------------
function synthUserIdByKey(key) {
  return scalar(`select id from auth.users where email = ${q(`${key}@${STAGE16A_SYNTHETIC_EMAIL_DOMAIN}`)} limit 1;`)
}
function groupMatches() {
  // match_number, id, scheduled_date, home team, away team (resolved slots),
  // plus the assigned kick-off (as an explicit UTC ISO instant, '' when unset).
  // kickoff_at is the sanctioned per-match time (scripts/assign-kickoff-times.mjs);
  // when present it drives the clock so the fake clock agrees with the UI/DB.
  const rows = runSql(`
    select m.match_number, m.id, m.scheduled_date,
      hs.resolved_tournament_team_id, as_.resolved_tournament_team_id,
      coalesce(to_char((m.kickoff_at at time zone 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '')
    from public.matches m
    join public.match_slots hs on hs.match_id=m.id and hs.side='home'
    join public.match_slots as_ on as_.match_id=m.id and as_.side='away'
    where m.tournament_id='${TOURNAMENT_ID}' and m.match_number between 1 and 36
    order by m.match_number;`, { rows: true })
  return rows.map(([num, id, date, home, away, kickoffIso]) => ({
    matchNumber: Number(num), id, scheduledDate: date, homeTeam: home, awayTeam: away,
    kickoffAt: kickoffIso ? kickoffIso : null,
  }))
}

// ---- prediction_seed_writer (Original group predictions) -------------------
function predictionForPersona(personaKey, actual, index) {
  // Deterministic per-persona strategy; produces varied, testable scoring.
  const { home, away } = actual
  if (personaKey === 'exact_score_heavy' || personaKey === 'submitted_complete') return { h: home, a: away }
  if (personaKey === 'all_wrong') return { h: away, a: home }
  // outcome-preserving, non-exact for everyone else
  return { h: Math.min(home + 1, 99), a: Math.min(away + 1, 99) }
}
function seedOriginalPredictions() {
  const matches = groupMatches()
  const originalPersonas = STAGE16A_SYNTHETIC_PERSONAS.filter(p => p.competitions.includes('original'))
  for (const persona of originalPersonas) {
    const uid = synthUserIdByKey(persona.key)
    if (!uid) continue
    const submitted = ['submitted_complete', 'joker_cap_reached', 'zero_jokers'].includes(persona.key)
    const setId = scalar(`
      insert into public.prediction_sets (tournament_id, user_id, competition_key, contract_version, scoring_ruleset_id, revision, submitted_at)
      values ('${TOURNAMENT_ID}', ${q(uid)}, 'original', ${q(CONTRACT_VERSION)}, '${RULESET_ID}', 0, ${submitted ? 'now()' : 'null'})
      on conflict (tournament_id, user_id, competition_key) do update set updated_at = now()
      returning id;`)
    if (persona.key === 'no_predictions' || persona.key === 'partial_predictions') {
      // no_predictions: set exists but empty. partial: only first 6 matches.
    }
    const limit = persona.key === 'partial_predictions' ? 6 : (persona.key === 'no_predictions' ? 0 : matches.length)
    let values = []
    matches.slice(0, limit).forEach((m, i) => {
      const pred = predictionForPersona(persona.key, syntheticScore(m.matchNumber), i)
      const joker = persona.key === 'joker_cap_reached' && i < 5
      values.push(`('${setId}','${TOURNAMENT_ID}','${m.id}',${q(m.homeTeam)},${q(m.awayTeam)},${pred.h},${pred.a},null,null,${joker})`)
    })
    if (values.length) {
      runSql(`
        insert into public.match_predictions (prediction_set_id, tournament_id, match_id,
          predicted_home_tournament_team_id, predicted_away_tournament_team_id, home_score_90, away_score_90,
          advancing_tournament_team_id, decision_method, joker_applied)
        values ${values.join(',')}
        on conflict (prediction_set_id, match_id) do nothing;`)
    }
  }
}

// ---- KO prediction sets (separate competition, exists with 0 pts pre-KO) ----
function seedKoPredictionSets() {
  const koPersonas = STAGE16A_SYNTHETIC_PERSONAS.filter(p => p.competitions.includes('ko_predictor'))
  for (const persona of koPersonas) {
    const uid = synthUserIdByKey(persona.key)
    if (!uid) continue
    runSql(`
      insert into public.prediction_sets (tournament_id, user_id, competition_key, contract_version, scoring_ruleset_id, revision, submitted_at)
      values ('${TOURNAMENT_ID}', ${q(uid)}, 'ko_predictor', ${q(CONTRACT_VERSION)}, '${RULESET_ID}', 0, null)
      on conflict (tournament_id, user_id, competition_key) do nothing;`)
  }
}

// ---- league_seed_writer -----------------------------------------------------
// Leagues are single-competition (migration 019). Two Original leagues plus one
// KO Predictor league keep the two competitions separate and evidence both.
const LEAGUE_SHAPES = [
  { name: 'Synthetic Large Table', code: 'SYNTHLARGE', competition: 'original', members: ['exact_score_heavy', 'outcome_only', 'all_wrong', 'submitted_complete', 'joker_cap_reached', 'zero_jokers', 'engineered_tie_a', 'engineered_tie_b', 'bracket_survives_deep', 'bracket_dead_early', 'ko_only', 'original_only', 'ko_advancing_only', 'correction_sensitive'] },
  { name: 'Synthetic Tiny H2H', code: 'SYNTHTINY0', competition: 'original', members: ['engineered_tie_a', 'engineered_tie_b'] },
  { name: 'Synthetic Multi League', code: 'SYNTHMULTI', competition: 'ko_predictor', members: ['exact_score_heavy', 'engineered_tie_a', 'correction_sensitive'] },
]
function seedLeagues() {
  for (const shape of LEAGUE_SHAPES) {
    const ownerUid = synthUserIdByKey(shape.members[0])
    if (!ownerUid) continue
    const leagueId = scalar(`
      insert into public.leagues (tournament_id, name, join_code, created_by_user_id, competition)
      values ('${TOURNAMENT_ID}', ${q(shape.name)}, ${q(shape.code)}, ${q(ownerUid)}, ${q(shape.competition)})
      on conflict (tournament_id, join_code) do update set updated_at = now()
      returning id;`)
    shape.members.forEach((key, i) => {
      const uid = synthUserIdByKey(key)
      if (!uid) return
      runSql(`
        insert into public.league_members (league_id, tournament_id, user_id, member_role)
        values ('${leagueId}','${TOURNAMENT_ID}',${q(uid)}, ${i === 0 ? "'owner'" : "'member'"})
        on conflict (league_id, user_id) do nothing;`)
    })
  }
}

// ---- Clock derivation (pure) ------------------------------------------------
export function effectiveKickoff(scheduledDate, matchNumber) {
  const hour = KICKOFF_HOURS_UTC[(matchNumber - 1) % KICKOFF_HOURS_UTC.length]
  return new Date(`${scheduledDate}T${String(hour).padStart(2, '0')}:00:00.000Z`)
}
export { syntheticScore, hash32 }
// Given time T and a match, derive target state: 'scheduled' | 'live' | 'final'
export function deriveMatchState(T, kickoff, durationMin = GROUP_MATCH_DURATION_MIN) {
  const finish = new Date(kickoff.getTime() + durationMin * 60000)
  if (T < kickoff) return 'scheduled'
  if (T < finish) return 'live'
  return 'final'
}

// ---- record via EXISTING function (service-role/superuser direct call) ------
function recordResult(matchId, { status, resultStatus, home, away, winner, decision }) {
  runSql(`select private.euro28_record_match_result(
    '${TOURNAMENT_ID}'::uuid, '${matchId}'::uuid, ${q(status)}, ${q(resultStatus)},
    ${home === null ? 'null' : home}, ${away === null ? 'null' : away},
    null, null, null, null, ${q(decision)}, ${winner ? `'${winner}'::uuid` : 'null'},
    'system', null);`)
}

// The core P6C operation: set clock to T and reconcile ALL group matches to
// their derived state. Idempotent + bidirectional (recompute-from-T).
function setClock(targetTimeIso) {
  const T = targetTimeIso === REAL_NOW_SENTINEL ? new Date() : new Date(targetTimeIso)
  if (Number.isNaN(T.getTime())) throw new Error(`invalid clock time: ${targetTimeIso}`)

  // Set the sanctioned P2 staging clock too (application-time view).
  runSql(`
    insert into public.tournament_time_controls (tournament_id, is_enabled, simulated_at, phase_key, note)
    values ('${TOURNAMENT_ID}', true, ${q(T.toISOString())}, 'custom', 'Stage 16A-P6C synthetic clock')
    on conflict (tournament_id) do update set
      is_enabled = true, simulated_at = ${q(T.toISOString())}, phase_key = 'custom',
      revision = public.tournament_time_controls.revision + 1, updated_at = now();`)

  const matches = groupMatches()
  const current = new Map(runSql(`
    select match_number, status, result_status, home_score_90, away_score_90
    from public.matches where tournament_id='${TOURNAMENT_ID}' and match_number between 1 and 36;`,
    { rows: true }).map(r => [Number(r[0]), { status: r[1], resultStatus: r[2],
      home: r[3] === '' ? null : r[3], away: r[4] === '' ? null : r[4] }]))

  const summary = { scheduled: 0, live: 0, final: 0, writes: 0 }
  for (const m of matches) {
    // Prefer the sanctioned kickoff_at from the DB (assign-kickoff-times.mjs) so
    // the fake clock, the UI and the DB all agree on when a match is live/final.
    // Fall back to the derived slot only when a match has no assigned kickoff_at.
    const kickoff = m.kickoffAt ? new Date(m.kickoffAt) : effectiveKickoff(m.scheduledDate, m.matchNumber)
    const state = deriveMatchState(T, kickoff)
    const cur = current.get(m.matchNumber)
    summary[state] += 1

    if (state === 'final') {
      // Full-time: completed + confirmed with the deterministic final score.
      const s = syntheticScore(m.matchNumber)
      const winner = s.home > s.away ? m.homeTeam : s.away > s.home ? m.awayTeam : null
      const already = cur && cur.status === 'completed' && cur.resultStatus === 'confirmed'
        && Number(cur.home) === s.home && Number(cur.away) === s.away
      if (!already) {
        recordResult(m.id, { status: 'completed', resultStatus: 'confirmed', home: s.home, away: s.away, winner, decision: 'normal_time' })
        summary.writes += 1
      }
    } else if (state === 'live') {
      // In progress: kicked off but not finished → status 'live', no confirmed
      // result yet. 'live' is a match status, not a result, so set it directly
      // (the result function is only for pending/confirmed/void results). Clear
      // any prior confirmed synthetic result first (bidirectional revert).
      if (cur && cur.resultStatus === 'confirmed') {
        // 'void' is the schema's undo path (only void/manual_review skip the
        // score requirement); it clears scores and makes the match unscoreable.
        recordResult(m.id, { status: 'scheduled', resultStatus: 'void', home: null, away: null, winner: null, decision: null })
        summary.writes += 1
      }
      if (!cur || cur.status !== 'live') {
        runSql(`update public.matches set status='live', updated_at=now() where id='${m.id}' and tournament_id='${TOURNAMENT_ID}';`)
        summary.writes += 1
      }
    } else {
      // Scheduled: no result. Revert any prior confirmed/live synthetic state
      // via 'void' (the only status that clears scores without requiring them).
      // A pristine scheduled/pending match with null scores needs no write.
      const hasSyntheticState = cur && (cur.status !== 'scheduled' || cur.resultStatus === 'confirmed' || cur.home !== null)
      if (hasSyntheticState) {
        recordResult(m.id, { status: 'scheduled', resultStatus: 'void', home: null, away: null, winner: null, decision: null })
        summary.writes += 1
      }
    }
  }

  // Knockout fixtures: once the whole group stage is final, resolve the R16
  // participants by CALLING the existing resolver (not reimplementing it);
  // otherwise ensure R16 stays unresolved (bidirectional).
  if (summary.final === 36) summary.koFixturesResolved = resolveKnockout()
  else { clearKnockoutResolution(); summary.koFixturesResolved = 0 }

  // Run the EXISTING scoring engine (full recompute).
  runSql(`select private.euro28_recalculate_points('${TOURNAMENT_ID}'::uuid, null);`)
  return { T: T.toISOString(), ...summary }
}

// ---- Knockout resolution via the EXISTING resolver -------------------------
// Group_position/best_third R16 slots have no actual-results DB resolver, but
// private.euro28_expected_knockout_participants derives them from a prediction
// bundle. Feeding it a bundle that MIRRORS the confirmed group results yields
// the real R16 participants — this calls existing resolver logic, it does not
// reimplement it. QF→final still resolve via match_winner when R16 is recorded.
function resolveKnockout() {
  const rows = runSql(`
    select m.id, hs.resolved_tournament_team_id, as_.resolved_tournament_team_id,
      m.home_score_90, m.away_score_90
    from public.matches m
    join public.match_slots hs on hs.match_id=m.id and hs.side='home'
    join public.match_slots as_ on as_.match_id=m.id and as_.side='away'
    where m.tournament_id='${TOURNAMENT_ID}' and m.match_number between 1 and 36
      and m.result_status='confirmed'
    order by m.match_number;`, { rows: true })
  const bundle = rows.map(([id, home, away, hs, as_]) => ({
    match_id: id, predicted_home_tournament_team_id: home, predicted_away_tournament_team_id: away,
    home_score_90: Number(hs), away_score_90: Number(as_), advancing_tournament_team_id: null,
    decision_method: null, joker_applied: false,
  }))
  const ko = runSql(`
    select k.match_number, k.home_team_id, k.away_team_id, k.participants_resolved
    from private.euro28_expected_knockout_participants('${TOURNAMENT_ID}'::uuid, ${q(JSON.stringify(bundle))}::jsonb) k
    where k.match_number between 37 and 44 and k.participants_resolved
    order by k.match_number;`, { rows: true })
  let resolved = 0
  for (const [matchNumber, homeTeam, awayTeam] of ko) {
    runSql(`
      update public.match_slots s set resolved_tournament_team_id = ${q(homeTeam)}, resolved_at = now()
      from public.matches m where s.match_id = m.id and s.side='home'
        and m.tournament_id='${TOURNAMENT_ID}' and m.match_number = ${Number(matchNumber)};
      update public.match_slots s set resolved_tournament_team_id = ${q(awayTeam)}, resolved_at = now()
      from public.matches m where s.match_id = m.id and s.side='away'
        and m.tournament_id='${TOURNAMENT_ID}' and m.match_number = ${Number(matchNumber)};`)
    resolved += 1
  }
  return resolved
}
function clearKnockoutResolution() {
  // Revert R16 participant resolution when the group stage is not complete.
  runSql(`
    update public.match_slots s set resolved_tournament_team_id = null, resolved_at = null
    from public.matches m where s.match_id = m.id and m.tournament_id='${TOURNAMENT_ID}'
      and m.match_number between 37 and 44 and s.source_type in ('group_position','best_third');`)
}

// ---- seed_validator ---------------------------------------------------------
function counts() {
  const c = {}
  const rows = runSql(`
    select 'users', count(*) from (${SYNTH_USER_SELECT}) u
    union all select 'profiles', count(*) from public.profiles where id in (${SYNTH_USER_SELECT})
    union all select 'prediction_sets', count(*) from public.prediction_sets where user_id in (${SYNTH_USER_SELECT})
    union all select 'prediction_sets_original', count(*) from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}) and competition_key='original'
    union all select 'prediction_sets_ko', count(*) from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}) and competition_key='ko_predictor'
    union all select 'match_predictions', count(*) from public.match_predictions where prediction_set_id in (select id from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}))
    union all select 'bracket_predictions', count(*) from public.bracket_predictions where prediction_set_id in (select id from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}))
    union all select 'leagues', count(*) from public.leagues where created_by_user_id in (${SYNTH_USER_SELECT})
    union all select 'league_members', count(*) from public.league_members where user_id in (${SYNTH_USER_SELECT})
    union all select 'prediction_match_points', count(*) from public.prediction_match_points where prediction_set_id in (select id from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}))
    union all select 'prediction_totals', count(*) from public.prediction_totals where user_id in (${SYNTH_USER_SELECT})
    union all select 'total_points_original', coalesce(sum(total_points),0) from public.prediction_totals where user_id in (${SYNTH_USER_SELECT}) and competition_key='original'
    union all select 'total_points_ko', coalesce(sum(total_points),0) from public.prediction_totals where user_id in (${SYNTH_USER_SELECT}) and competition_key='ko_predictor'
    union all select 'confirmed_results', count(*) from public.matches where tournament_id='${TOURNAMENT_ID}' and result_status='confirmed';`,
    { rows: true })
  for (const [k, v] of rows) c[k] = Number(v)
  return c
}

// ---- synthetic_teardown -----------------------------------------------------
function teardown() {
  // Delete only dual-marker synthetic data. Leagues first (created_by is ON
  // DELETE RESTRICT), then users (cascades profiles/predictions/points/totals).
  runSql(`delete from public.leagues where created_by_user_id in (${SYNTH_USER_SELECT});`)
  runSql(`delete from auth.users where id in (${SYNTH_USER_SELECT});`)
}
function zeroResidue() {
  const checks = {
    'auth.users': `select count(*) from (${SYNTH_USER_SELECT}) u`,
    'public.profiles': `select count(*) from public.profiles where display_name like 'Syn16A %'`,
    'public.prediction_sets': `select count(*) from public.prediction_sets where user_id in (${SYNTH_USER_SELECT})`,
    'public.match_predictions': `select count(*) from public.match_predictions where prediction_set_id in (select id from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}))`,
    'public.bracket_predictions': `select count(*) from public.bracket_predictions where prediction_set_id in (select id from public.prediction_sets where user_id in (${SYNTH_USER_SELECT}))`,
    'public.prediction_totals': `select count(*) from public.prediction_totals where user_id in (${SYNTH_USER_SELECT})`,
    'public.leagues': `select count(*) from public.leagues where name like 'Synthetic %'`,
    'public.league_members': `select count(*) from public.league_members where user_id in (${SYNTH_USER_SELECT})`,
  }
  const residue = {}
  let clean = true
  for (const [target, sql] of Object.entries(checks)) {
    const n = Number(scalar(sql))
    residue[target] = n
    if (n !== 0) clean = false
  }
  return { clean, residue }
}

// ---- LOCAL backup (satisfies the precondition against the local DB) --------
function makeLocalBackup() {
  const root = process.env.EURO28_BACKUP_ROOT
  if (!root) throw new Error('local-backup: EURO28_BACKUP_ROOT unset')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(root, `local-${stamp}`)
  fs.mkdirSync(dir, { recursive: true })
  const dump = execFileSync('docker', ['exec', '-i', LOCAL_DB_CONTAINER, 'pg_dump', '-U', 'postgres', '-d', 'postgres'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  const dumpFile = 'local-db.sql'
  fs.writeFileSync(path.join(dir, dumpFile), dump)
  const sha = crypto.createHash('sha256').update(dump).digest('hex')
  fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), `${sha}  ${dumpFile}\n`)
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    engine: 'pg_dump (local container)', target: 'local', createdAt: new Date().toISOString(),
    note: 'Stage 16A-P6C local backup precondition',
  }, null, 2))
  return { dir, bytes: dump.length }
}

// ---- CLI --------------------------------------------------------------------
function seedAll() {
  seedUsers()
  seedOriginalPredictions()
  seedKoPredictionSets()
  seedLeagues()
}

function main() {
  const [cmd, arg] = process.argv.slice(2)
  switch (cmd) {
    case 'context': {
      const ctx = assertContext({ requireWriteFlags: false })
      console.log(JSON.stringify({ ok: true, ...ctx, zeroResidueTargets: STAGE16A_P6A_ZERO_RESIDUE_TARGETS.length }, null, 2))
      break
    }
    case 'seed': {
      assertContext()
      const backup = requireFreshBackup()
      seedAll()
      console.log(JSON.stringify({ seeded: true, backup, counts: counts() }, null, 2))
      break
    }
    case 'set-clock': {
      assertContext()
      requireFreshBackup()
      console.log(JSON.stringify({ clock: setClock(arg), counts: counts() }, null, 2))
      break
    }
    case 'reset-clock': {
      assertContext()
      requireFreshBackup()
      console.log(JSON.stringify({ clock: setClock(REAL_NOW_SENTINEL), counts: counts() }, null, 2))
      break
    }
    case 'verify': {
      console.log(JSON.stringify(counts(), null, 2))
      break
    }
    case 'teardown': {
      assertContext({ requireTeardownConfirmation: true })
      requireFreshBackup()
      teardown()
      console.log(JSON.stringify({ teardown: true, ...zeroResidue() }, null, 2))
      break
    }
    case 'zero-residue': {
      console.log(JSON.stringify(zeroResidue(), null, 2))
      break
    }
    case 'local-backup': {
      assertContext({ requireWriteFlags: false })
      console.log(JSON.stringify({ backup: makeLocalBackup() }, null, 2))
      break
    }
    default:
      console.error('usage: stage16a-p6c-executor.mjs <context|local-backup|seed|set-clock <iso>|reset-clock|verify|teardown|zero-residue>')
      process.exit(2)
  }
}

// Only run the CLI when invoked directly (keeps pure logic import-safe for tests).
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('stage16a-p6c-executor.mjs')) {
  main()
}
