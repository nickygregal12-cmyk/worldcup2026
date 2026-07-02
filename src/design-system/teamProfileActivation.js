export function resolveTeamProfileActivation({
  unresolved,
  team,
  explicitHandler,
  contextHandler,
}) {
  if (unresolved) return null
  const tournamentTeamId = team?.tournamentTeamId ?? team?.teamId ?? null
  if (!tournamentTeamId) return explicitHandler ?? null
  if (explicitHandler) return explicitHandler
  if (!contextHandler) return null
  return () => contextHandler(team)
}
