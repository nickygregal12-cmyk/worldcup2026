import path from 'node:path'
import {
  assertSafeOutputPath,
  escapeSqlLiteral,
  EURO28_PROJECT_REF,
  EURO28_TOURNAMENT_CODE,
  normaliseEmail,
} from './stagingAdminSql.mjs'

export const STAGE13FK3_ACTIONS = Object.freeze([
  'role-transaction',
  'reconciliation-verify',
])

export const FIXTURE_ACCEPTANCE_NOTE =
  'Stage 13F-K3 transactional fixture acceptance; rollback required'
export const RECONCILIATION_ACCEPTANCE_NOTE =
  'Stage 13F-K3 complete staging reconciliation acceptance'

export function normaliseAcceptanceAction(value) {
  const action = String(value ?? '').trim().toLowerCase()
  if (!STAGE13FK3_ACTIONS.includes(action)) {
    throw new Error(`--action must be one of: ${STAGE13FK3_ACTIONS.join(', ')}`)
  }
  return action
}

export function normaliseAcceptanceNote(value) {
  const note = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (note.length < 5 || note.length > 500) {
    throw new Error('--note must be between 5 and 500 characters')
  }
  return note
}

function requireDistinctEmails(ownerEmail, resultsEmail, memberEmail) {
  const emails = [ownerEmail, resultsEmail, memberEmail]
  if (new Set(emails).size !== emails.length) {
    throw new Error('Owner, results-admin and ordinary-member emails must be distinct')
  }
}

function header(action) {
  return `-- Euro 2028 Stage 13F-K3 ${action}\n-- Project ref: ${EURO28_PROJECT_REF}\n-- Tournament: ${EURO28_TOURNAMENT_CODE}\n-- Generated locally. Review every line before running in the Euro staging SQL Editor.\n-- Never run this script against WC26 production.\n`
}

function emailLookupGuard(label, email, variableName) {
  return `  select count(*), min(id::text)::uuid\n  into v_${variableName}_count, v_${variableName}_id\n  from auth.users\n  where lower(email) = lower('${escapeSqlLiteral(email)}');\n\n  if v_${variableName}_count <> 1 then\n    raise exception 'Expected exactly one ${label} Auth user for ${escapeSqlLiteral(email)}, found %', v_${variableName}_count;\n  end if;`
}

export function buildRoleTransactionSql({ ownerEmail, resultsEmail, memberEmail }) {
  const owner = normaliseEmail(ownerEmail)
  const results = normaliseEmail(resultsEmail)
  const member = normaliseEmail(memberEmail)
  requireDistinctEmails(owner, results, member)

  return `${header('role and transactional fixture acceptance')}
-- This script performs one same-value fixture update and one complete reconciliation
-- inside a database transaction, proves the expected role boundaries, then ROLLS BACK.
-- It never invents a kick-off: the fixture call reuses the persisted date, kick-off,
-- venue and schedule status selected from Euro staging.

begin;

create temp table stage13fk3_context on commit preserve rows as
with tournament as (
  select id
  from public.tournaments
  where code = '${EURO28_TOURNAMENT_CODE}'
), selected_match as (
  select match_row.*
  from public.matches match_row
  join tournament on tournament.id = match_row.tournament_id
  where match_row.status in ('scheduled', 'postponed')
    and match_row.result_status = 'pending'
    and match_row.result_revision = 0
  order by match_row.match_number
  limit 1
)
select
  tournament.id as tournament_id,
  owner_user.id as owner_user_id,
  results_user.id as results_user_id,
  member_user.id as member_user_id,
  selected_match.id as match_id,
  selected_match.match_number,
  selected_match.fixture_revision,
  selected_match.scheduled_date,
  selected_match.kickoff_at,
  selected_match.venue_id,
  selected_match.schedule_status,
  selected_match.updated_at,
  (
    select count(*)
    from public.admin_operation_events event
    where event.tournament_id = tournament.id
      and event.note = '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}'
  ) as initial_fixture_event_count,
  (
    select count(*)
    from public.admin_operation_events event
    where event.tournament_id = tournament.id
      and event.note = '${escapeSqlLiteral(RECONCILIATION_ACCEPTANCE_NOTE)}'
  ) as initial_reconciliation_event_count
from tournament
cross join lateral (
  select id from auth.users where lower(email) = lower('${escapeSqlLiteral(owner)}')
) owner_user
cross join lateral (
  select id from auth.users where lower(email) = lower('${escapeSqlLiteral(results)}')
) results_user
cross join lateral (
  select id from auth.users where lower(email) = lower('${escapeSqlLiteral(member)}')
) member_user
cross join selected_match;

do $stage13fk3_preflight$
declare
  v_tournament_count integer;
  v_owner_count integer;
  v_results_count integer;
  v_member_count integer;
  v_match_count integer;
  v_owner_id uuid;
  v_results_id uuid;
  v_member_id uuid;
  v_tournament_id uuid;
begin
  select count(*), min(id::text)::uuid
  into v_tournament_count, v_tournament_id
  from public.tournaments
  where code = '${EURO28_TOURNAMENT_CODE}';

  if v_tournament_count <> 1 then
    raise exception 'Expected exactly one ${EURO28_TOURNAMENT_CODE} tournament, found %', v_tournament_count;
  end if;

${emailLookupGuard('owner', owner, 'owner')}

${emailLookupGuard('results-admin', results, 'results')}

${emailLookupGuard('ordinary-member', member, 'member')}

  if v_owner_id = v_results_id or v_owner_id = v_member_id or v_results_id = v_member_id then
    raise exception 'Acceptance accounts must be three distinct Auth users';
  end if;

  if not exists (
    select 1 from private.tournament_admins
    where tournament_id = v_tournament_id
      and user_id = v_owner_id
      and admin_role = 'owner'
      and is_active = true
  ) then
    raise exception 'The owner account is not an active Euro tournament owner';
  end if;

  if not exists (
    select 1 from private.tournament_admins
    where tournament_id = v_tournament_id
      and user_id = v_results_id
      and admin_role = 'results_admin'
      and is_active = true
  ) then
    raise exception 'The results-admin account is not an active Euro results administrator';
  end if;

  if exists (
    select 1 from private.tournament_admins
    where tournament_id = v_tournament_id
      and user_id = v_member_id
      and is_active = true
  ) then
    raise exception 'The ordinary-member account unexpectedly has active Admin access';
  end if;

  if not private.euro28_is_feature_enabled(v_tournament_id, 'scoring_recalculation') then
    raise exception 'The scoring_recalculation feature must be enabled for Stage 13F-K3 acceptance';
  end if;

  select count(*) into v_match_count from pg_temp.stage13fk3_context;
  if v_match_count <> 1 then
    raise exception 'Expected exactly one safe pending fixture for transactional acceptance, found %', v_match_count;
  end if;
end
$stage13fk3_preflight$;

commit;

begin;

do $stage13fk3_roles$
declare
  context_row pg_temp.stage13fk3_context%rowtype;
  access_payload jsonb;
  fixture_payload jsonb;
  reconciliation_payload jsonb;
  event_count bigint;
  row_count bigint;
begin
  select * into strict context_row from pg_temp.stage13fk3_context;

  perform set_config('request.jwt.claim.sub', context_row.results_user_id::text, true);
  access_payload := public.get_my_tournament_admin_access(context_row.tournament_id);
  if access_payload->>'is_admin' <> 'true' or access_payload->>'admin_role' <> 'results_admin' then
    raise exception 'Results-admin access payload did not resolve correctly: %', access_payload;
  end if;

  select count(*) into row_count
  from public.admin_list_tournament_matches(context_row.tournament_id);
  if row_count <> 51 then
    raise exception 'Results admin expected 51 fixtures, found %', row_count;
  end if;

  if not exists (
    select 1 from public.admin_list_tournament_venues(context_row.tournament_id)
  ) then
    raise exception 'Results admin could not read tournament venues';
  end if;

  perform public.admin_get_tournament_control_room(context_row.tournament_id);

  begin
    perform public.admin_update_match_fixture(
      context_row.tournament_id,
      context_row.match_id,
      context_row.fixture_revision,
      context_row.scheduled_date,
      context_row.kickoff_at,
      context_row.venue_id,
      context_row.schedule_status,
      '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}'
    );
    raise exception 'Results admin unexpectedly changed a fixture';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'Tournament owner access is required' then raise; end if;
  end;

  begin
    perform public.admin_reconcile_tournament_points(
      context_row.tournament_id,
      '${escapeSqlLiteral(RECONCILIATION_ACCEPTANCE_NOTE)}'
    );
    raise exception 'Results admin unexpectedly reconciled tournament points';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'Tournament owner access is required' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', context_row.member_user_id::text, true);
  access_payload := public.get_my_tournament_admin_access(context_row.tournament_id);
  if access_payload->>'is_admin' <> 'false' or access_payload->>'admin_role' is not null then
    raise exception 'Ordinary-member access did not fail closed: %', access_payload;
  end if;

  begin
    perform public.admin_list_tournament_matches(context_row.tournament_id);
    raise exception 'Ordinary member unexpectedly read Admin fixtures';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'Tournament administrator access is required' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', context_row.owner_user_id::text, true);
  access_payload := public.get_my_tournament_admin_access(context_row.tournament_id);
  if access_payload->>'is_admin' <> 'true' or access_payload->>'admin_role' <> 'owner' then
    raise exception 'Owner access payload did not resolve correctly: %', access_payload;
  end if;

  fixture_payload := public.admin_update_match_fixture(
    context_row.tournament_id,
    context_row.match_id,
    context_row.fixture_revision,
    context_row.scheduled_date,
    context_row.kickoff_at,
    context_row.venue_id,
    context_row.schedule_status,
    '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}'
  );

  if (fixture_payload->>'fixture_revision')::bigint <> context_row.fixture_revision + 1 then
    raise exception 'Owner fixture update did not increment revision exactly once: %', fixture_payload;
  end if;

  select count(*) into event_count
  from public.admin_operation_events event
  where event.tournament_id = context_row.tournament_id
    and event.match_id = context_row.match_id
    and event.operation_type = 'fixture_schedule_updated'
    and event.note = '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}';

  if event_count <> context_row.initial_fixture_event_count + 1 then
    raise exception 'Owner fixture update did not create one append-only event';
  end if;

  begin
    perform public.admin_update_match_fixture(
      context_row.tournament_id,
      context_row.match_id,
      context_row.fixture_revision,
      context_row.scheduled_date,
      context_row.kickoff_at,
      context_row.venue_id,
      context_row.schedule_status,
      '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}'
    );
    raise exception 'Stale fixture revision unexpectedly succeeded';
  exception
    when serialization_failure then
      if sqlerrm <> 'Fixture changed since it was loaded; refresh before saving' then raise; end if;
  end;

  reconciliation_payload := public.admin_reconcile_tournament_points(
    context_row.tournament_id,
    '${escapeSqlLiteral(RECONCILIATION_ACCEPTANCE_NOTE)}'
  );

  if reconciliation_payload->>'status' <> 'completed' then
    raise exception 'Transactional complete reconciliation did not complete: %', reconciliation_payload;
  end if;

  select count(*) into event_count
  from public.admin_operation_events event
  where event.tournament_id = context_row.tournament_id
    and event.operation_type = 'tournament_points_reconciled'
    and event.note = '${escapeSqlLiteral(RECONCILIATION_ACCEPTANCE_NOTE)}';

  if event_count <> context_row.initial_reconciliation_event_count + 1 then
    raise exception 'Transactional reconciliation did not create one append-only event';
  end if;

  if exists (
    select 1 from public.prediction_totals total
    where total.tournament_id = context_row.tournament_id
      and total.competition_key not in ('original', 'ko_predictor')
  ) then
    raise exception 'Reconciliation produced an unsupported combined competition total';
  end if;
end
$stage13fk3_roles$;

rollback;

do $stage13fk3_rollback_proof$
declare
  context_row pg_temp.stage13fk3_context%rowtype;
  current_match public.matches%rowtype;
  event_count bigint;
begin
  select * into strict context_row from pg_temp.stage13fk3_context;
  select * into strict current_match from public.matches where id = context_row.match_id;

  if current_match.fixture_revision <> context_row.fixture_revision
    or current_match.scheduled_date is distinct from context_row.scheduled_date
    or current_match.kickoff_at is distinct from context_row.kickoff_at
    or current_match.venue_id is distinct from context_row.venue_id
    or current_match.schedule_status is distinct from context_row.schedule_status
    or current_match.updated_at is distinct from context_row.updated_at
  then
    raise exception 'Fixture transaction did not roll back to the exact persisted state';
  end if;

  select count(*) into event_count
  from public.admin_operation_events event
  where event.tournament_id = context_row.tournament_id
    and event.note = '${escapeSqlLiteral(FIXTURE_ACCEPTANCE_NOTE)}';
  if event_count <> context_row.initial_fixture_event_count then
    raise exception 'Fixture audit event escaped the rollback transaction';
  end if;

  select count(*) into event_count
  from public.admin_operation_events event
  where event.tournament_id = context_row.tournament_id
    and event.note = '${escapeSqlLiteral(RECONCILIATION_ACCEPTANCE_NOTE)}';
  if event_count <> context_row.initial_reconciliation_event_count then
    raise exception 'Reconciliation audit event escaped the rollback transaction';
  end if;
end
$stage13fk3_rollback_proof$;

select
  '${EURO28_PROJECT_REF}' as expected_project_ref,
  '${EURO28_TOURNAMENT_CODE}' as tournament_code,
  '${escapeSqlLiteral(owner)}' as owner_email,
  '${escapeSqlLiteral(results)}' as results_admin_email,
  '${escapeSqlLiteral(member)}' as ordinary_member_email,
  match_number as transactional_match_number,
  fixture_revision as persisted_fixture_revision,
  'PASS — owner/results-admin/member permissions and rollback confirmed' as acceptance_result
from pg_temp.stage13fk3_context;

drop table pg_temp.stage13fk3_context;
`
}

export function buildReconciliationVerificationSql({ note }) {
  const resolvedNote = normaliseAcceptanceNote(note)

  return `${header('complete reconciliation evidence verification')}
-- Read-only verification. Run this after the owner performs one real complete
-- reconciliation through the deployed Euro control room with the exact note below.

do $stage13fk3_reconciliation$
declare
  v_tournament_id uuid;
  v_event_count bigint;
  v_run_id uuid;
  v_run_status text;
  v_total_count bigint;
begin
  select id into strict v_tournament_id
  from public.tournaments
  where code = '${EURO28_TOURNAMENT_CODE}';

  select count(*), min((event.payload->>'scoring_run_id')::uuid)
  into v_event_count, v_run_id
  from public.admin_operation_events event
  where event.tournament_id = v_tournament_id
    and event.operation_type = 'tournament_points_reconciled'
    and event.note = '${escapeSqlLiteral(resolvedNote)}';

  if v_event_count <> 1 or v_run_id is null then
    raise exception 'Expected exactly one reconciliation event for the supplied note, found %', v_event_count;
  end if;

  select status into v_run_status
  from public.scoring_runs
  where id = v_run_id
    and tournament_id = v_tournament_id;

  if v_run_status <> 'completed' then
    raise exception 'Expected completed scoring run %, found status %', v_run_id, v_run_status;
  end if;

  select count(*) into v_total_count
  from public.prediction_totals total
  where total.tournament_id = v_tournament_id;

  if exists (
    select 1 from public.prediction_totals total
    where total.tournament_id = v_tournament_id
      and total.competition_key not in ('original', 'ko_predictor')
  ) then
    raise exception 'Unsupported combined competition total detected';
  end if;

  if exists (
    select 1
    from public.prediction_totals total
    where total.tournament_id = v_tournament_id
    group by total.user_id, total.competition_key
    having count(*) <> 1
  ) then
    raise exception 'Duplicate competition total rows detected';
  end if;

  if v_total_count > 0 and exists (
    select 1 from public.prediction_totals total
    where total.tournament_id = v_tournament_id
      and total.last_scoring_run_id is distinct from v_run_id
  ) then
    raise exception 'One or more totals do not point to the accepted complete reconciliation run';
  end if;
end
$stage13fk3_reconciliation$;

select
  event.id as admin_event_id,
  event.note,
  event.created_at,
  event.payload->>'scoring_run_id' as scoring_run_id,
  run.status as scoring_run_status,
  run.started_at,
  run.completed_at
from public.admin_operation_events event
join public.tournaments tournament on tournament.id = event.tournament_id
join public.scoring_runs run on run.id = (event.payload->>'scoring_run_id')::uuid
where tournament.code = '${EURO28_TOURNAMENT_CODE}'
  and event.operation_type = 'tournament_points_reconciled'
  and event.note = '${escapeSqlLiteral(resolvedNote)}';

select
  competition_key,
  count(*) as total_rows,
  count(distinct user_id) as users,
  count(distinct last_scoring_run_id) as scoring_runs
from public.prediction_totals total
join public.tournaments tournament on tournament.id = total.tournament_id
where tournament.code = '${EURO28_TOURNAMENT_CODE}'
group by competition_key
order by competition_key;

select
  '${EURO28_PROJECT_REF}' as expected_project_ref,
  '${EURO28_TOURNAMENT_CODE}' as tournament_code,
  '${escapeSqlLiteral(resolvedNote)}' as accepted_note,
  'PASS — completed run, append-only event and separate competition totals confirmed' as acceptance_result;
`
}

export function buildStage13FK3AcceptanceSql(options) {
  const action = normaliseAcceptanceAction(options.action)
  if (action === 'role-transaction') return buildRoleTransactionSql(options)
  return buildReconciliationVerificationSql(options)
}

export function resolveAcceptanceOutputPath(outputPath, repositoryRoot) {
  if (!outputPath) return null
  return assertSafeOutputPath(path.resolve(outputPath), repositoryRoot)
}
