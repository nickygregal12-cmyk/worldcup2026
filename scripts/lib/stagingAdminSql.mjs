import path from 'node:path'

export const EURO28_PROJECT_REF = 'gcfdwobpnanjchcnvdco'
export const EURO28_TOURNAMENT_CODE = 'euro-2028'
export const ADMIN_ROLES = Object.freeze(['owner', 'results_admin'])
export const ADMIN_ACTIONS = Object.freeze(['grant', 'verify', 'revoke'])

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normaliseEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('A valid --email value is required')
  }
  return email
}

export function normaliseAction(value) {
  const action = String(value ?? '').trim().toLowerCase()
  if (!ADMIN_ACTIONS.includes(action)) {
    throw new Error(`--action must be one of: ${ADMIN_ACTIONS.join(', ')}`)
  }
  return action
}

export function normaliseRole(value, action) {
  if (action !== 'grant') return null
  const role = String(value ?? '').trim().toLowerCase()
  if (!ADMIN_ROLES.includes(role)) {
    throw new Error(`--role must be one of: ${ADMIN_ROLES.join(', ')}`)
  }
  return role
}

export function normaliseNote(value, action) {
  if (action === 'verify') return null
  const note = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (note.length < 5 || note.length > 500) {
    throw new Error('--note must be between 5 and 500 characters')
  }
  return note
}

export function escapeSqlLiteral(value) {
  return String(value).replaceAll("'", "''")
}

export function assertSafeOutputPath(outputPath, repositoryRoot) {
  if (!outputPath) return null
  const resolvedOutput = path.resolve(outputPath)
  const resolvedRepository = path.resolve(repositoryRoot)
  const relative = path.relative(resolvedRepository, resolvedOutput)
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('Refusing to write generated admin SQL inside the repository')
  }
  return resolvedOutput
}

function header({ action, email, role }) {
  return `-- Euro 2028 staging administrator ${action} script\n-- Project ref: ${EURO28_PROJECT_REF}\n-- Tournament: ${EURO28_TOURNAMENT_CODE}\n-- Target account: ${email}\n-- Requested role: ${role ?? 'current assignment'}\n-- Generated locally. Review every line before running in the Supabase SQL Editor.\n-- This script must only be run against Euro staging.\n`
}

function guardBlock({ email, includeCurrentRole = false }) {
  return `declare\n  v_tournament_id uuid;\n  v_tournament_count integer;\n  v_user_id uuid;\n  v_user_count integer;${includeCurrentRole ? '\n  v_current_role text;' : ''}\nbegin\n  select count(*), min(id::text)::uuid\n  into v_tournament_count, v_tournament_id\n  from public.tournaments\n  where code = '${EURO28_TOURNAMENT_CODE}';\n\n  if v_tournament_count <> 1 then\n    raise exception 'Expected exactly one ${EURO28_TOURNAMENT_CODE} tournament, found %', v_tournament_count;\n  end if;\n\n  select count(*), min(id::text)::uuid\n  into v_user_count, v_user_id\n  from auth.users\n  where lower(email) = lower('${escapeSqlLiteral(email)}');\n\n  if v_user_count <> 1 then\n    raise exception 'Expected exactly one auth user for ${escapeSqlLiteral(email)}, found %', v_user_count;\n  end if;`
}

function verificationSelect(email) {
  return `select\n  tournament.code as tournament_code,\n  app_user.email as account_email,\n  assignment.admin_role,\n  assignment.is_active,\n  assignment.granted_at,\n  assignment.revoked_at,\n  assignment.updated_at\nfrom public.tournaments tournament\njoin private.tournament_admins assignment\n  on assignment.tournament_id = tournament.id\njoin auth.users app_user\n  on app_user.id = assignment.user_id\nwhere tournament.code = '${EURO28_TOURNAMENT_CODE}'\n  and lower(app_user.email) = lower('${escapeSqlLiteral(email)}');\n\nselect\n  event.operation_type,\n  target.email as target_email,\n  event.note,\n  event.payload,\n  event.created_at\nfrom public.admin_operation_events event\njoin public.tournaments tournament\n  on tournament.id = event.tournament_id\nleft join auth.users target\n  on target.id = event.target_user_id\nwhere tournament.code = '${EURO28_TOURNAMENT_CODE}'\n  and lower(target.email) = lower('${escapeSqlLiteral(email)}')\n  and event.operation_type in ('admin_granted', 'admin_revoked')\norder by event.created_at desc\nlimit 5;`
}

export function buildStagingAdminSql({ action, email, role, note }) {
  const resolvedAction = normaliseAction(action)
  const resolvedEmail = normaliseEmail(email)
  const resolvedRole = normaliseRole(role, resolvedAction)
  const resolvedNote = normaliseNote(note, resolvedAction)

  if (resolvedAction === 'verify') {
    return `${header({ action: resolvedAction, email: resolvedEmail, role: resolvedRole })}\n${verificationSelect(resolvedEmail)}\n`
  }

  if (resolvedAction === 'grant') {
    return `${header({ action: resolvedAction, email: resolvedEmail, role: resolvedRole })}\nbegin;\n\ndo $euro28_admin$\n${guardBlock({ email: resolvedEmail })}\n\n  perform private.euro28_set_tournament_admin(\n    v_tournament_id,\n    v_user_id,\n    '${resolvedRole}',\n    true,\n    null,\n    '${escapeSqlLiteral(resolvedNote)}'\n  );\nend\n$euro28_admin$;\n\n${verificationSelect(resolvedEmail)}\n\ncommit;\n`
  }

  return `${header({ action: resolvedAction, email: resolvedEmail, role: resolvedRole })}\nbegin;\n\ndo $euro28_admin$\n${guardBlock({ email: resolvedEmail, includeCurrentRole: true })}\n\n  select assignment.admin_role\n  into v_current_role\n  from private.tournament_admins assignment\n  where assignment.tournament_id = v_tournament_id\n    and assignment.user_id = v_user_id;\n\n  if v_current_role is null then\n    raise exception 'No tournament administrator assignment exists for ${escapeSqlLiteral(resolvedEmail)}';\n  end if;\n\n  perform private.euro28_set_tournament_admin(\n    v_tournament_id,\n    v_user_id,\n    v_current_role,\n    false,\n    null,\n    '${escapeSqlLiteral(resolvedNote)}'\n  );\nend\n$euro28_admin$;\n\n${verificationSelect(resolvedEmail)}\n\ncommit;\n`
}
