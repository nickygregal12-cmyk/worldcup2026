import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { useMemo, useState } from 'react'
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { euro28VenueHostIso } from '../config/tournament.js'
import { APP_DESTINATIONS, APP_ROUTE } from '../app/appRoutes.js'
import { PredictionInputRow, TeamLabel, PredictionStateBadge, Button, Dialog, JokerMeter, JokerPill, MatchCard, TiebreakPositionPicker, Icon } from '../design-system/index.jsx'
import { flagAssetForTeamIso } from '../design-system/teamFlagRegistry.js'
import {
  buildUnresolvedTies,
  reconcileTieResolutions,
  resolutionFor,
  saveResolution,
} from '../design-system/tiebreakModel.js'
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
import flowStyles from './GroupsPredictorFlow.module.css'
import { GROUPS_DATE_TABLES_COPY } from './predictionJourneyCopy.js'
import useGroupsLanding from './useGroupsLanding.js'
import { GroupStandingsTable, ThirdPlaceQualificationTable } from '../tournament/QualificationTables.jsx'

const GROUP_TOTAL = 36

// The bracket's own registered destination, not a hash spelled out here. The route
// registry is the single source of truth and the route audit is what keeps it honest.
const BRACKET_DESTINATION = APP_DESTINATIONS.find(destination => destination.key === APP_ROUTE.BRACKET)
const MATCH_CENTRE_DESTINATION = APP_DESTINATIONS.find(destination => destination.key === APP_ROUTE.MATCH_CENTRE)

function formatMatchDate(dateValue) {
  if (!dateValue) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
    .format(new Date(String(dateValue).includes('T') ? dateValue : `${dateValue}T12:00:00Z`))
}

// A confirmed kick-off, or nothing. §5: the provisional indicator is a FEATURE and
// appears only when the database genuinely lacks the time — never a filled-in guess.
function formatKickoff(kickoffAt) {
  if (!kickoffAt) return null
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
    .format(new Date(kickoffAt))
    .replace(' ', '')
}

// The tables, inline and one tap away, open by default while you are predicting.
// They replace the two bordered asides that used to sit below every group — the same
// numbers, but as a thing you open rather than a thing you scroll past.
function PredictedTables({ table, groupCode, ranking, reference, open }) {
  return (
    <details className={flowStyles.tables} open={open}>
      <summary>
        <strong>Your predicted tables</strong>
        <Icon name="chevron" size={18} className={flowStyles.chevron} />
      </summary>
      {table && (
        <div className={flowStyles.tableCard}>
          <h4>Group {groupCode}</h4>
          <GroupStandingsTable groupCode={groupCode} table={table} reference={reference} caption={`Your predicted Group ${groupCode} table`} />
          <p className={flowStyles.tableNote}>The top two teams qualify automatically. The best third-place teams can also reach the knockouts.</p>
        </div>
      )}
      <div className={flowStyles.tableCard}>
        {/* The summary above already says these are YOUR predicted tables; the prototype
            repeats "from your predictions" on each heading, which is duplication here. */}
        <h4>Best third-placed</h4>
        <ThirdPlaceQualificationTable ranking={ranking} reference={reference} caption="Your predicted third-place qualification table" />
        <p className={flowStyles.tableNote}>These four also reach the Round of 16.</p>
      </div>
    </details>
  )
}

function GroupsTablesSheet({ model, reference, open, selectedKey, onSelect, onClose }) {
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
            ? <ThirdPlaceQualificationTable ranking={model.bestThird.ranking} reference={reference} caption="Your predicted third-place qualification table" />
            : <GroupStandingsTable groupCode={selectedGroup.code} table={selectedGroup.table} reference={reference} caption={`Your predicted Group ${selectedGroup.code} table`} />}
          <p className={viewStyles.sheetNote}>Top two qualify from each group. The third-place tab shows the best-four ranking that shapes your bracket.</p>
        </div>
      </section>
    </>
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
  const { viewMode, setViewMode, openGroup, setOpenGroup } = useGroupsLanding(reference)
  const [tablesOpen, setTablesOpen] = useState(false)
  const [selectedTableKey, setSelectedTableKey] = useState('A')
  const [savedTies, setSavedTies] = useState({})
  const groupProgress = useMemo(() => buildGroupProgress(reference, draft), [reference, draft])
  const dateSections = useMemo(() => buildGroupDateSections(reference), [reference])
  const tablesModel = useMemo(() => buildGroupsTablesSheetModel(reference, draft), [reference, draft])
  const isDateView = viewMode === GROUPS_VIEW_MODE.DATE

  // Item 64. The resolver tells us which teams its criteria could not separate;
  // a saved ordering survives only while that group's scores are untouched.
  const ties = useMemo(() => buildUnresolvedTies(tablesModel, reference, draft), [tablesModel, reference, draft])
  const { resolutions, resetGroupCodes } = useMemo(() => reconcileTieResolutions(savedTies, ties), [savedTies, ties])

  const tieForGroup = code => ties.find(tie => tie.groupCode === code) ?? null

  const renderTiebreak = tie => tie && (
    <TiebreakPositionPicker
      // Remount when the scores move, so a reset cannot leave a stale order on screen.
      key={`${tie.groupCode}-${tie.signature}`}
      tie={tie}
      initialOrder={resolutionFor(resolutions, tie)}
      resetNotice={resetGroupCodes.includes(tie.groupCode)}
      onResolve={order => setSavedTies(previous => saveResolution(previous, tie, order))}
    />
  )

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
    const kickoff = formatKickoff(match.kickoffAt)
    const hostFlag = flagAssetForTeamIso(euro28VenueHostIso(match.venueName))

    return (
      <MatchCard
        key={match.matchId}
        id={`group-match-${match.matchNumber}`}
        className={`group-match-card${row.jokerApplied ? ' group-match-card--joker' : ''}`}
        lineClassName="group-match-card__prediction"
        data-match-number={match.matchNumber}
        meta={
          <span className={flowStyles.matchMeta}>
            <span className={flowStyles.when}>{formatMatchDate(match.scheduledDate)}</span>
            {kickoff
              ? <span>· {kickoff}</span>
              : <span className={flowStyles.provisional}>PROVISIONAL</span>}
            {match.venueName && <span className={flowStyles.venue}>· {match.venueName}</span>}
            {hostFlag && <span className={flowStyles.hostFlag}><img src={hostFlag} alt="" /></span>}
          </span>
        }
        badge={isDateView
          ? <button className={viewStyles.groupTag} type="button" onClick={() => openTable(match.groupCode)}>Group {match.groupCode}</button>
          : <PredictionStateBadge state={state} />}
        home={<TeamLabel team={homeTeam} compact />}
        away={<TeamLabel team={awayTeam} compact reverse alignEnd />}
        centre={<PredictionInputRow
          homeValue={row.homeScore}
          awayValue={row.awayScore}
          homeLabel={`${homeTeam?.label ?? 'Home team'} score in match ${match.matchNumber}`}
          awayLabel={`${awayTeam?.label ?? 'Away team'} score in match ${match.matchNumber}`}
          readOnly={scoreReadOnly}
          grace={hasGrace}
          state={state}
          compact
          onHomeChange={homeScore => onChange(match, { homeScore })}
          onAwayChange={awayScore => onChange(match, { awayScore })}
        />}
        note={<a className={flowStyles.matchCentreLink} href={`${MATCH_CENTRE_DESTINATION.hash}?match=${match.matchNumber}&competition=original`}>Match Centre <Icon name="chevron" size={16} /></a>}
        action={<JokerPill aria-pressed={row.jokerApplied} active={row.jokerApplied} disabled={jokerDisabled} multiplier={EURO_SCORING_CONFIG.joker.MULTIPLIER} statusLabel={jokerLabel} matchLabel={`match ${match.matchNumber}`} onClick={() => onChange(match, { jokerApplied: !row.jokerApplied })} />}
      />
    )
  }

  const openGroupMatches = reference.groupMatches.filter(match => match.groupCode === openGroup)
  const openGroupTable = tablesModel.groups.find(item => item.code === openGroup)?.table

  return (
    <div className="groups-predictor" data-contract="dp-groups-v2">
      {/* One compact strip, then straight into the matches. Jokers and progress are
          the two numbers you want while you work, so they come with you as you scroll. */}
      <section className={viewStyles.focusStrip} aria-label="Group prediction progress">
        <div className={`${viewStyles.viewToggle}`} aria-label="Choose groups prediction view">
          <button type="button" className={!isDateView ? viewStyles.on : ''} onClick={() => setViewMode(GROUPS_VIEW_MODE.GROUP)}>By group</button>
          <button type="button" className={isDateView ? viewStyles.on : ''} onClick={() => setViewMode(GROUPS_VIEW_MODE.DATE)}>By date</button>
        </div>
        <div className={viewStyles.focusMeters}>
          <JokerMeter value={summary.groupJokers} max={summary.groupJokerCap} multiplier={EURO_SCORING_CONFIG.joker.MULTIPLIER} label="group jokers selected" />
          <span className={viewStyles.progressPill}>
            <span className={viewStyles.miniMeter} aria-hidden="true"><i style={{ width: `${Math.round((summary.groupComplete / GROUP_TOTAL) * 100)}%` }} /></span>
            <span>{summary.groupComplete}/{GROUP_TOTAL}</span>
          </span>
        </div>
      </section>

      {!isDateView ? (
        <>
          <nav className={viewStyles.groupRail} aria-label="Choose a group">
            {reference.groups.map(group => {
              const progress = groupProgress.find(item => item.code === group.code)
              const classes = [
                group.code === openGroup ? viewStyles.selected : '',
                progress?.isComplete ? viewStyles.railComplete : '',
              ].filter(Boolean).join(' ')
              return (
                <button type="button" key={group.code} className={classes} aria-pressed={group.code === openGroup} aria-label={`Group ${group.code}, ${progress?.complete ?? 0} of ${progress?.total ?? 6} scores entered`} onClick={() => setOpenGroup(group.code)}>
                  {group.code}
                </button>
              )
            })}
          </nav>

          <div className={flowStyles.cardList}>{openGroupMatches.map(renderMatchCard)}</div>
          {renderTiebreak(tieForGroup(openGroup))}
          <PredictedTables table={openGroupTable} groupCode={openGroup} ranking={tablesModel.bestThird.ranking} reference={reference} open />
        </>
      ) : (
        <section className={viewStyles.dateView} aria-label="Group matches by date">
          {dateSections.map(section => (
            <section className={viewStyles.dateSection} key={section.key}>
              <header><strong>{section.label}</strong><span>{formatMatchDate(section.date)}</span></header>
              <div className={flowStyles.cardList}>{section.matches.map(renderMatchCard)}</div>
            </section>
          ))}
          {/* Ties are a property of a group, not a date, but a player who never leaves
              this view must still be told their positions need setting. */}
          {ties.map(renderTiebreak)}
          <PredictedTables table={null} groupCode={openGroup} ranking={tablesModel.bestThird.ranking} reference={reference} open={false} />
          <p className={viewStyles.sheetNote}>{GROUPS_DATE_TABLES_COPY}</p>
          <button className={viewStyles.tablesPill} type="button" onClick={() => setTablesOpen(true)}>Tables</button>
        </section>
      )}

      <GroupsTablesSheet model={tablesModel} reference={reference} open={tablesOpen} selectedKey={selectedTableKey} onSelect={setSelectedTableKey} onClose={() => setTablesOpen(false)} />

      {/* Groups is a step, not a destination: the tables you just built ARE the seeding.
          The bracket is named in full — "bracket" alone would be ambiguous between this
          one and the KO Predictor's, and §4 keeps those two strictly apart. */}
      <a className={flowStyles.flowCta} href={BRACKET_DESTINATION.hash}>
        <span>
          <span className={flowStyles.title}>Continue to your Original Bracket</span>
          <span className={flowStyles.sub}>Your Group A–F tables feed the Round of 16</span>
        </span>
        <span className={flowStyles.arrow} aria-hidden="true"><Icon name="chevron" size={20} /></span>
      </a>

      <details className={viewStyles.helperDisclosure}>
        <summary><strong>Lucky Dip</strong><span>Need a starting point?</span></summary>
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

      <section className={flowStyles.nextStep}>
        <div>
          <h3>{summary.groupComplete === GROUP_TOTAL ? 'Your group predictions are complete' : `${GROUP_TOTAL - summary.groupComplete} group scores left`}</h3>
          <p>{summary.groupComplete === GROUP_TOTAL ? 'Your group tables are ready for the bracket.' : 'You can leave and return at any time. Completed scores stay saved.'}</p>
        </div>
        <Button variant="secondary" icon="check" onClick={onOpenReview}>Review progress</Button>
      </section>
    </div>
  )
}
