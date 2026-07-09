import { z } from 'zod'

const id = z.string().min(1)
const nullableId = id.nullable().optional()
const nullableString = z.string().nullable().optional()
const numeric = z.union([z.number(), z.string()]).optional()

export const tournamentRowSchema = z.object({
  id,
  code: z.literal('euro-2028'),
  name: z.string().min(1),
}).passthrough()

export const scoringRulesetRowSchema = z.object({
  id,
  ruleset_key: z.string().min(1),
  status: z.string().min(1),
}).passthrough().nullable()

export const foundationStageRowsSchema = z.array(z.object({ id, code: z.string().min(1), sequence: numeric }).passthrough())
export const foundationGroupRowsSchema = z.array(z.object({ id, code: z.string().min(1), sequence: numeric }).passthrough())
export const tournamentTeamRowsSchema = z.array(z.object({ id, slot_code: z.string().min(1) }).passthrough())
export const tournamentVenueRowsSchema = z.array(z.object({ venue_id: id }).passthrough())
export const groupMembershipRowsSchema = z.array(z.object({ group_id: id, tournament_team_id: id }).passthrough())
export const matchRowsSchema = z.array(z.object({ id, match_number: numeric }).passthrough())
export const matchSlotRowsSchema = z.array(z.object({ id, match_id: id, side: z.enum(['home', 'away']) }).passthrough())

export const profileRowSchema = z.object({
  id,
  display_name: z.string().min(1),
}).passthrough()

export const predictionSetRowSchema = z.object({
  id,
  tournament_id: id,
  competition_key: z.enum(['original', 'ko_predictor']),
  revision: numeric,
}).passthrough()

const matchPredictionRowSchema = z.object({
  match_id: id.optional(),
  match_number: numeric,
  home_score_90: numeric.nullable().optional(),
  away_score_90: numeric.nullable().optional(),
}).passthrough().refine(row => Boolean(row.match_id) || row.match_number !== undefined, { message: 'A match id or match number is required.' })

export const matchPredictionRowsSchema = z.array(matchPredictionRowSchema)

export const bracketPredictionRowsSchema = z.array(z.object({
  match_id: id.optional(),
  match_number: numeric,
  advancing_tournament_team_id: nullableId,
}).passthrough().refine(row => Boolean(row.match_id) || row.match_number !== undefined, { message: 'A match id or match number is required.' }))

export const predictionSaveResultSchema = z.object({
  prediction_set_id: id,
  competition_key: z.enum(['original', 'ko_predictor']).optional(),
  revision: numeric,
  saved_prediction_count: numeric,
}).passthrough()

export const graceWindowRowsSchema = z.array(z.object({
  id,
  tournament_id: id,
  user_id: id,
  match_id: id,
  competition_key: z.enum(['original', 'ko_predictor']),
}).passthrough())

export const canonicalResultRowsSchema = z.array(z.object({
  id,
  match_number: numeric,
  status: z.string().min(1),
  result_status: z.string().min(1),
  result_revision: numeric,
}).passthrough())

export const leaderboardRowsSchema = z.array(z.object({
  user_id: id,
  display_name: z.string().min(1).optional(),
  rank: numeric,
  total_points: numeric,
}).passthrough())

export const pointsBreakdownSchema = z.object({
  competition_key: z.enum(['original', 'ko_predictor']).optional(),
  total_points: numeric,
}).passthrough().nullable()

export const playerCompetitionPointsSchema = z.object({
  visible: z.boolean(),
  competition_key: z.enum(['original', 'ko_predictor']),
  member_user_id: id,
  display_name: z.string().min(1),
  state: z.enum(['protected', 'unscored', 'scored']),
  total_points: numeric,
  match_breakdown: z.array(z.record(z.string(), z.unknown())),
  bracket_breakdown: z.array(z.record(z.string(), z.unknown())),
  reason: nullableString,
}).passthrough()

export const leagueRowsSchema = z.array(z.object({
  league_id: id,
  league_name: z.string().min(1),
  member_count: numeric,
}).passthrough())

export const leagueStandingRowsSchema = z.array(z.object({
  user_id: id,
  display_name: z.string().min(1),
  rank: numeric,
  total_points: numeric,
}).passthrough())

export const sharedPredictionBundleSchema = z.object({
  visible: z.boolean().optional(),
  display_name: z.string().optional(),
  reason: nullableString,
  match_predictions: matchPredictionRowsSchema.optional(),
  bracket_predictions: bracketPredictionRowsSchema.optional(),
}).passthrough()

export const teamProfilePayloadSchema = z.object({
  team: z.record(z.string(), z.unknown()).optional(),
  curated: z.record(z.string(), z.unknown()).optional(),
  predictions: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

export const adminAccessSchema = z.union([
  z.object({ is_admin: z.boolean().optional(), admin_role: nullableString }).passthrough(),
  z.array(z.object({ is_admin: z.boolean().optional(), admin_role: nullableString }).passthrough()),
  z.null(),
])

export const adminRecordRowsSchema = z.array(z.record(z.string(), z.unknown()))
export const adminRecordSchema = z.record(z.string(), z.unknown())

export const mutationResultSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.record(z.string(), z.unknown())),
  z.boolean(),
  z.string(),
  z.number(),
  z.null(),
])
