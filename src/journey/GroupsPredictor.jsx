import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { useMemo, useState } from 'react'
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { ScoreInput, TeamLabel, PredictionStateBadge, Button, Dialog, ProgressBar, JokerMeter, JokerPill } from '../design-system/index.jsx'
import { hasActivePredictionGrace, isPredictionMatchStarted, PREDICTION_COMPETITION_KEY } from '../grace/index.js'
import {
  GROUPS_TABLE_KEY,
  GROUPS_VIEW_MODE,
  buildGroupDateSections,
  buildGroupProgress,
  buildGroupsTablesSheetModel,
  deriveGroupMatchState,
  jokerControlLabel,
} from './groupsPresentationModel.js'
import { EURO_LUCKY_DIP_MODE } from './euroLuckyDip.js'
import actionStyles from './GroupsPredictorActions.module.css'
import viewStyles from './GroupsPredictor.module.css'
import polishStyles from './GroupsPredictorPolish.module.css'

function formatMatchDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateValue}T12:00:00Z`))
}

function scrollToGroup(code) {
  document.getElementById(`group-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function teamName(row) {
  return row.label ?? row.name ?? row.stableKey ?? row.teamId
}

function GroupTable({ table, rows = table?.rows ?? [], bestThird = false }) {
  return (
    <table className={viewStyles.table}>
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          {bestThird ? <th>Grp</th> : null}
          <th className={viewStyles.right}>P</th>
          <th className={viewStyles.right}>GD</th>
          <th className={viewStyles.right}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const qualifies = bestThird ? row.qualifiesAsBestThird : row.rank <= 2
          return (
            <tr className={qualifies ? viewStyles.qualifies : ''} key={`${row.groupCode ?? table?.groupCode}-${row.teamId}`}>
              <td>{bestThird ? row.bestThirdRank : row.rank}</td>
              <td>{teamName(row)}</td>
              {bestThird ? <td>{row.groupCode}</td> : null}
              <td className={viewStyles.right}>{row.played}</td>
              <td className={viewStyles.right}>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
              <td className={viewStyles.right}><strong>{row.points}</strong></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function GroupsTablesSheet({ model, open, selectedKey, onSelect, onClose }) {
  const selectedGroup = model.groups.find(group => group.code === selectedKey) ?? model.groups[0]
  const showThird = selectedKey === GROUPS_TABLE_KEY.THIRD_PLACE
  const title = showThird ? 'Predicted third-place ranking' : `Predicted table — Group ${selectedGroup.code}`

  return (
    <>
      <button className={`${viewStyles.sheetVeil}${open ? ` ${viewStyles.open}` : ''}`} type="button" aria-label="Close predicted tables" onClick={onClose} />
      <section className={`${viewStyles.sheet}${open ? ` ${viewStyles.open}` : ''}`} aria-hidden={!open} aria-label="Predicted tables sheet">
        <div className={viewStyles.sheetInner}>
          <div className={viewStyles.sheetGrab} aria-hidden="true" />
          <header className={viewStyles.sheetHead}>
            <div>
              <span className="page-eyebrow">Tables fast path</span>
              <h3>{title}</h3>
            </div>
            <button className={viewStyles.sheetClose} type="button" onClick={onClose}>Close</button>
          </header>
          <nav className={viewStyles.sheetRail} aria-label="Choose predicted table">
            {model.groups.map(group => (
              <button className={selectedKey === group.code ? viewStyles.selected : ''} type="button" key={group.code} onClick={() => onSelect(group.code)}>
                {group.code}
              </button>
            ))}
            <button className={selectedKey === GROUPS_TABLE_KEY.THIRD_PLACE ? viewStyles.selected : ''} type="button" onClick={() => onSelect(GROUPS_TABLE_KEY.THIRD_PLACE)}>
              3rd place
            </button>
          </nav>
          {showThird
            ? <GroupTable rows={model.bestThird.ranking} bestThird />
            : <GroupTable table={selectedGroup.table} />}
          <p className={viewStyles.sheetNote}>Top two qualify from each group. The third-place tab shows the best-four ranking that shapes your bracket, calculated live from your predictions.</p>
        </div>
      </section>
    </>
  )
}


function GroupsContractTablePreview({ table, groupCode, onOpen }) {
  if (!table) return null

  return (
    <aside className={polishStyles.contractTablePreview} aria-label={`Live predicted Group ${groupCode} table preview`}>
      <header>
        <div>
          <span className="page-eyebrow">Live table</span>
          <strong>Predicted Group {groupCode}</strong>
        </div>
        <button type="button" onClick={onOpen}>Open all tables</button>
      </header>
      <GroupTable table={table} />
      <p>Top two qualify. The same shared table model feeds the third-place ranking and your Original Bracket.</p>
    </aside>
  )
}

function GroupsContractThirdPlacePreview({ ranking = [], onOpen }) {
  return (
    <aside className={polishStyles.contractThirdPreview} aria-label="Best third-place live preview">
      <header>
        <div>
          <span className="page-eyebrow">Bracket feed</span>
          <strong>Best third-place race</strong>
        </div>
        <button type="button" onClick={onOpen}>View ranking</button>
      </header>
      <GroupTable rows={ranking.slice(0, 4)} bestThird />
      <p>The best four third-placed teams stay in your tournament path. This preview uses the same live ranking as the tables sheet.</p>
    </aside>
  )
}

export default function GroupsPredictor({
  reference,
  draft,
  summary,
  scoreLocked,
  reviewMode,
  graceWindows,
  autosaveStatus,
  context,
  activeMatchNumber,
  onChange,
  onLuckyDip,
  luckyDipDisabled,
  onOpenReview,
}) {
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [viewMode, setViewMode] = useState(GROUPS_VIEW_MODE.GROUP)
  const [tablesOpen, setTablesOpen] = useState(false)
  const [selectedTableKey, setSelectedTableKey] = useState('A')
  const groupProgress = useMemo(() => buildGroupProgress(reference, draft), [reference, draft])
  const dateSections = useMemo(() => buildGroupDateSections(reference), [reference])
  const tablesModel = useMemo(() => buildGroupsTablesSheetModel(reference, draft), [reference, draft])
  const isDateView = viewMode === GROUPS_VIEW_MODE.DATE

  const openTable = code => {
    setSelectedTableKey(code)
    setTablesOpen(true)
  }

  const renderMatchCard = match => {
    const row = draft.groupPredictions[String(match.matchNumber)] ?? { homeScore: null, awayScore: null, jokerApplied: false }
    const complete = row.homeScore != null && row.awayScore != null
    const capReached = summary.groupJokers >= summary.groupJokerCap && !row.jokerApplied
    const started = isPredictionMatchStarted(match)
    const hasGrace = hasActivePredictionGrace(graceWindows, {
      competitionKey: PREDICTION_COMPETITION_KEY.ORIGINAL,
      matchId: match.matchId,
    })
    const scoreReadOnly = reviewMode || (scoreLocked && !hasGrace)
    const jokerDisabled = reviewMode || started || capReached
    const state = deriveGroupMatchState({
      reviewMode,
      locked: scoreLocked && !hasGrace,
      hasGrace,
      active: activeMatchNumber === match.matchNumber,
      autosaveStatus,
      context,
      complete,
    })
    const homeTeam = reference.teamsById?.[match.homeTeamId]
    const awayTeam = reference.teamsById?.[match.awayTeamId]
    const jokerLabel = jokerControlLabel({ applied: row.jokerApplied, disabled: jokerDisabled, capReached, started, reviewMode })

    return (
      <article className={`group-match-card${row.jokerApplied ? ' group-match-card--joker' : ''}`} key={match.matchId} data-match-number={match.matchNumber}>
        <header className="group-match-card__header">
          <div><strong>Match {match.matchNumber}</strong><span>{formatMatchDate(match.scheduledDate)}</span></div>
          {isDateView
            ? <button className={viewStyles.groupTag} type="button" onClick={() => openTable(match.groupCode)}>Group {match.groupCode}</button>
            : <PredictionStateBadge state={state} />}
        </header>

        <div className="group-match-card__prediction">
          <div className="group-match-team group-match-team--home"><TeamLabel team={homeTeam} compact /></div>
          <ScoreInput value={row.homeScore} label={`${homeTeam?.label ?? 'Home team'} score in match ${match.matchNumber}`} readOnly={scoreReadOnly} grace={hasGrace} state={state} onChange={homeScore => onChange(match, { homeScore })} />
          <span className="group-match-card__separator" aria-hidden="true">–</span>
          <ScoreInput value={row.awayScore} label={`${awayTeam?.label ?? 'Away team'} score in match ${match.matchNumber}`} readOnly={scoreReadOnly} grace={hasGrace} state={state} onChange={awayScore => onChange(match, { awayScore })} />
          <div className="group-match-team group-match-team--away"><TeamLabel team={awayTeam} compact /></div>
        </div>

        <footer className="group-match-card__footer">
          <span>{complete ? `${row.homeScore}–${row.awayScore} predicted` : 'Enter both scores'}</span>
          <JokerPill aria-pressed={row.jokerApplied} active={row.jokerApplied} disabled={jokerDisabled} multiplier={EURO_SCORING_CONFIG.joker.MULTIPLIER} statusLabel={jokerLabel} matchLabel={`match ${match.matchNumber}`} onClick={() => onChange(match, { jokerApplied: !row.jokerApplied })} />
        </footer>
      </article>
    )
  }

  return (
    <div className="groups-predictor">
      <section className={`${viewStyles.focusStrip} ${polishStyles.focusStrip} ${polishStyles.nightContract}`} data-contract="night-broadcast-groups" aria-label="Group prediction progress">
        <div className={polishStyles.focusIntro}>
          <div className={polishStyles.focusHeader}>
            <div className={polishStyles.focusCopy}>
              <span className="page-eyebrow">Group stage</span>
              <h2>{isDateView ? 'Predict by date' : 'Predict by group'}</h2>
              <p>Pick every group score, place up to five jokers, then watch the live tables shape your Original Bracket.</p>
            </div>
            <button className={polishStyles.focusTableButton} type="button" onClick={() => setTablesOpen(true)}>
              <span aria-hidden="true">▦</span>
              Open predicted tables
            </button>
          </div>
          <div className={polishStyles.contractMeta} aria-label="Groups contract guardrails">
            <span>Private until lock</span>
            <span>Live tables</span>
            <span>Five 2× jokers</span>
          </div>
        </div>
        <div className={viewStyles.focusMeters}>
          <ProgressBar value={summary.groupComplete} max={36} label="Group predictions completed" />
          <JokerMeter value={summary.groupJokers} max={summary.groupJokerCap} multiplier={EURO_SCORING_CONFIG.joker.MULTIPLIER} label="group jokers selected" />
        </div>
      </section>

      <div className={`${viewStyles.viewToggle} ${polishStyles.viewToggle}`} aria-label="Choose groups prediction view">
        <button type="button" className={!isDateView ? viewStyles.on : ''} onClick={() => setViewMode(GROUPS_VIEW_MODE.GROUP)}>
          <span>By group</span>
          <small>Group cards and table jumps</small>
        </button>
        <button type="button" className={isDateView ? viewStyles.on : ''} onClick={() => setViewMode(GROUPS_VIEW_MODE.DATE)}>
          <span>By date</span>
          <small>Fixtures in order</small>
        </button>
      </div>

      <details className={viewStyles.helperDisclosure}>
        <summary><span>Lucky Dip</span><strong>Need a starting point?</strong><small>Optional local helper</small></summary>
        <div className={actionStyles.actions} aria-label="Lucky Dip group score helper">
          <div><p>Generate realistic group scores locally. Lucky Dip never uses odds and never changes your jokers.</p></div>
          <div className={actionStyles.buttons}>
            <Button variant="secondary" onClick={() => onLuckyDip(EURO_LUCKY_DIP_MODE.EMPTY)} disabled={luckyDipDisabled}>Fill empty scores</Button>
            <Button variant="secondary" onClick={() => setReplaceOpen(true)} disabled={luckyDipDisabled}>Replace all scores</Button>
          </div>
        </div>
      </details>

      <Dialog open={replaceOpen} title="Replace every group score?" onClose={() => setReplaceOpen(false)}>
        <div className={actionStyles.dialog}>
          <p>This replaces all 36 group scores with a fresh Lucky Dip. Jokers stay where they are, and any bracket picks made impossible by the new tables are cleared.</p>
          <div className={actionStyles.dialogActions}>
            <Button variant="secondary" onClick={() => setReplaceOpen(false)}>Keep my scores</Button>
            <Button onClick={() => { onLuckyDip(EURO_LUCKY_DIP_MODE.REPLACE); setReplaceOpen(false) }}>Replace all scores</Button>
          </div>
        </div>
      </Dialog>

      {!isDateView ? (
        <>
          <nav className={`${viewStyles.groupRail} ${polishStyles.groupRail}`} aria-label="Jump to a group">
            {groupProgress.map(group => (
              <button type="button" key={group.code} className={group.isComplete ? viewStyles.railComplete : ''} onClick={() => scrollToGroup(group.code)} aria-label={`Jump to Group ${group.code}`}>
                <span>Group {group.code}</span>
                <small>{group.complete}/{group.total} scores</small>
                <em aria-hidden="true"><i style={{ width: `${Math.round((group.complete / group.total) * 100)}%` }} /></em>
              </button>
            ))}
          </nav>
          <div className="groups-list">
            {reference.groups.map(group => {
              const matches = reference.groupMatches.filter(match => match.groupCode === group.code)
              const progress = groupProgress.find(item => item.code === group.code)
              return (
                <section className="group-section" id={`group-${group.code}`} key={group.code} aria-labelledby={`group-${group.code}-title`}>
                  <header className="group-section__header"><div><span className="page-eyebrow">Original Predictor</span><h3 id={`group-${group.code}-title`}>Group {group.code}</h3></div><PredictionStateBadge state={progress.isComplete ? 'complete' : 'empty'} label={`${progress.complete}/${progress.total} complete`} /></header>
                  <div className="group-match-list">{matches.map(renderMatchCard)}</div>
                  <GroupsContractTablePreview table={tablesModel.groups.find(item => item.code === group.code)?.table} groupCode={group.code} onOpen={() => openTable(group.code)} />
                </section>
              )
            })}
          </div>
          <GroupsContractThirdPlacePreview ranking={tablesModel.bestThird.ranking} onOpen={() => openTable(GROUPS_TABLE_KEY.THIRD_PLACE)} />
        </>
      ) : (
        <section className={viewStyles.dateView} aria-label="Group matches by date">
          <div className={viewStyles.dateIntro}><span className="page-eyebrow">By date</span><h3>All group fixtures in matchday order</h3><p>Group tags keep context on every ticket. Use the sticky Tables pill for a one-tap standings check from anywhere in the date list.</p></div>
          {dateSections.map(section => <section className={viewStyles.dateSection} key={section.key}><header><strong>{section.label}</strong><span>{formatMatchDate(section.date)}</span></header><div className="group-match-list">{section.matches.map(renderMatchCard)}</div></section>)}
          <button className={viewStyles.tablesPill} type="button" onClick={() => setTablesOpen(true)}>▦ Tables</button>
        </section>
      )}

      <GroupsTablesSheet model={tablesModel} open={tablesOpen} selectedKey={selectedTableKey} onSelect={setSelectedTableKey} onClose={() => setTablesOpen(false)} />

      <section className="groups-next-step">
        <div><span className="page-eyebrow">Next step</span><h3>{summary.groupComplete === 36 ? 'Your group predictions are complete' : `${36 - summary.groupComplete} group scores left`}</h3><p>{summary.groupComplete === 36 ? 'Your predicted tables now feed the permanent pre-tournament bracket.' : 'You can leave and return at any time. Completed scores remain saved.'}</p></div>
        <Button variant="secondary" icon="check" onClick={onOpenReview}>Review progress</Button>
      </section>
    </div>
  )
}
