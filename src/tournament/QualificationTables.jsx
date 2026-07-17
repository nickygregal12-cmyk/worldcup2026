import { useMemo, useState } from 'react'
import { Badge, TeamLabel } from '../design-system/index.jsx'
import styles from './QualificationTables.module.css'

function signed(value) {
  const number = Number(value ?? 0)
  return number > 0 ? `+${number}` : String(number)
}

function teamFor(reference, row) {
  return reference?.teamsById?.[row?.teamId] ?? row ?? null
}

function groupEntries(groupTables) {
  if (!groupTables) return []
  return Array.isArray(groupTables)
    ? groupTables.map(item => [item.code ?? item.groupCode, item.table ?? item])
    : Object.entries(groupTables)
}

export function GroupStandingsTable({ groupCode, table, reference, caption = `Group ${groupCode} standings` }) {
  const rows = table?.rows ?? []
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col" className={styles.number}>P</th>
            <th scope="col" className={`${styles.number} ${styles.optional}`}>W</th>
            <th scope="col" className={`${styles.number} ${styles.optional}`}>D</th>
            <th scope="col" className={`${styles.number} ${styles.optional}`}>L</th>
            <th scope="col" className={styles.number}>GD</th>
            <th scope="col" className={styles.number}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={`${groupCode}-${row.teamId}`} className={row.rank <= 2 ? styles.qualifies : ''}>
              <td><strong>{row.rank}</strong></td>
              <th scope="row"><TeamLabel team={teamFor(reference, row)} compact /></th>
              <td className={styles.number}>{row.played}</td>
              <td className={`${styles.number} ${styles.optional}`}>{row.wins}</td>
              <td className={`${styles.number} ${styles.optional}`}>{row.draws}</td>
              <td className={`${styles.number} ${styles.optional}`}>{row.losses}</td>
              <td className={styles.number}>{signed(row.goalDifference)}</td>
              <td className={styles.number}><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ThirdPlaceQualificationTable({ ranking = [], reference, caption = 'Third-place qualification standings', qualificationActive = true }) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.thirdTable}`}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col">Grp</th>
            <th scope="col" className={styles.number}>P</th>
            <th scope="col" className={styles.number}>GD</th>
            <th scope="col" className={styles.number}>Pts</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(row => {
            const qualifies = qualificationActive && Boolean(row.qualifiesAsBestThird ?? Number(row.bestThirdRank) <= 4)
            return (
              <tr key={`third-${row.teamId}`} className={qualificationActive ? (qualifies ? styles.qualifies : styles.outside) : ''}>
                <td><strong>{qualificationActive ? row.bestThirdRank : '—'}</strong></td>
                <th scope="row"><TeamLabel team={teamFor(reference, row)} compact /></th>
                <td>{row.groupCode}</td>
                <td className={styles.number}>{row.played}</td>
                <td className={styles.number}>{signed(row.goalDifference)}</td>
                <td className={styles.number}><strong>{row.points}</strong></td>
                <td><span className={qualifies ? styles.statusIn : styles.statusOut}>{qualificationActive ? (qualifies ? 'Qualifies' : 'Outside') : 'Pending'}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function QualificationTables({
  groupTables,
  bestThird,
  reference,
  selectedGroupCode,
  onSelectGroup,
  showSelector = true,
  contextLabel = 'Live qualification',
  qualificationActive = true,
}) {
  const groups = useMemo(() => groupEntries(groupTables).filter(([, table]) => table), [groupTables])
  const [internalGroup, setInternalGroup] = useState(groups[0]?.[0] ?? 'A')
  const activeCode = selectedGroupCode ?? (groups.some(([code]) => code === internalGroup) ? internalGroup : groups[0]?.[0])
  const activeTable = groups.find(([code]) => code === activeCode)?.[1] ?? groups[0]?.[1]
  const ranking = bestThird?.ranking ?? bestThird ?? []
  const selectGroup = code => {
    setInternalGroup(code)
    onSelectGroup?.(code)
  }

  if (!activeTable && ranking.length === 0) return null

  return (
    <section className={styles.compound} aria-label={`${contextLabel} tables`}>
      <div className={styles.heading}>
        <div>
          <span>{contextLabel}</span>
          <h3>{activeCode ? `Group ${activeCode}` : 'Group standings'}</h3>
        </div>
        {activeTable && <Badge tone="info">{activeTable.completedMatchCount ?? 0}/6 played</Badge>}
      </div>
      {showSelector && groups.length > 1 && (
        <nav className={styles.groupRail} aria-label="Choose group table">
          {groups.map(([code]) => (
            <button key={code} type="button" aria-pressed={code === activeCode} className={code === activeCode ? styles.selected : ''} onClick={() => selectGroup(code)}>
              {code}
            </button>
          ))}
        </nav>
      )}
      {activeTable && <GroupStandingsTable groupCode={activeCode} table={activeTable} reference={reference} />}
      <div className={styles.thirdHeading}>
        <div>
          <span>Qualification line</span>
          <h3>Third-place table</h3>
        </div>
        <Badge tone="safe">Top four qualify</Badge>
      </div>
      <ThirdPlaceQualificationTable ranking={ranking} reference={reference} qualificationActive={qualificationActive} />
    </section>
  )
}
