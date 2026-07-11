import ScoreInput from './ScoreInput.jsx'
import styles from './PredictionInputRow.module.css'

// The shared prediction input row: two score inputs either side of a centred
// dash. Groups and KO Predictor both compose this so the steppers, direct
// numeric entry and the high-score confirm — all owned by ScoreInput — stay
// identical across surfaces. Team labels stay with the caller: Groups puts them
// in the MatchCard slots; KO renders them beside this row.
export default function PredictionInputRow({
  homeValue,
  awayValue,
  homeLabel,
  awayLabel,
  onHomeChange,
  onAwayChange,
  readOnly = false,
  grace = false,
  state = 'idle',
  className = '',
}) {
  return (
    <div className={`${styles.row} ${className}`.trim()} data-prediction-input-row="true">
      <ScoreInput value={homeValue} label={homeLabel} readOnly={readOnly} grace={grace} state={state} onChange={onHomeChange} />
      <span className={styles.dash} aria-hidden="true">–</span>
      <ScoreInput value={awayValue} label={awayLabel} readOnly={readOnly} grace={grace} state={state} onChange={onAwayChange} />
    </div>
  )
}
