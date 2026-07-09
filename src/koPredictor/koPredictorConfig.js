import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'

export const EURO28_KO_PREDICTOR_VERSION = 'euro28-ko-predictor-v1'
export const EURO28_KO_PREDICTOR_RPC = 'save_my_ko_prediction_bundle'
export const KO_PREDICTOR_COMPETITION_KEY = 'ko_predictor'
// Single client source: the cap lives in the central scoring configuration (and, at
// runtime, in the loaded database ruleset) — never as a separate literal here.
export const KO_PREDICTOR_JOKER_CAP = EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP
export const KO_PREDICTOR_MATCH_COUNT = 15
