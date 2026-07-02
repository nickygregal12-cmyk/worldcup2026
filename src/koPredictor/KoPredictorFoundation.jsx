import { useEffect, useMemo, useState } from 'react'
import KoPredictorMatchCentre from './KoPredictorMatchCentre.jsx'
import { createKoPredictorDraft, buildKoPredictorRows, summariseKoPredictor, updateKoPredictorDraft } from './koPredictorModel.js'
import { loadMyKoPredictionBundle, loadMyKoPredictorStanding, saveMyKoPredictionBundle } from './koPredictorService.js'

export default function KoPredictorFoundation({ client, reference, fixtureBundle, fixtureStanding }) {
  const fixtureMode = fixtureBundle !== undefined
  const [session, setSession] = useState(() => fixtureMode ? { user: { id: 'visual-user' } } : null)
  const [bundle, setBundle] = useState(() => fixtureBundle ?? null)
  const [standing, setStanding] = useState(() => fixtureStanding ?? { points: 0, rank: null })
  const [draft, setDraft] = useState(() => createKoPredictorDraft(reference, fixtureBundle ?? null))
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState(() => fixtureMode ? 'dirty' : 'idle')
  const summary = useMemo(() => summariseKoPredictor(reference, draft), [reference, draft])

  useEffect(() => {
    if (fixtureMode || !client) return undefined
    let active = true
    async function load(nextSession) {
      if (!active) return
      setSession(nextSession)
      if (!nextSession?.user) {
        setBundle(null)
        setStanding({ points: 0, rank: null })
        setDraft(createKoPredictorDraft(reference))
        setSaveState('idle')
        return
      }
      const [nextBundle, nextStanding] = await Promise.all([
        loadMyKoPredictionBundle(client, reference.tournamentId, nextSession.user.id),
        loadMyKoPredictorStanding(client, reference.tournamentId, nextSession.user.id),
      ])
      if (!active) return
      setBundle(nextBundle)
      setStanding(nextStanding)
      setDraft(createKoPredictorDraft(reference, nextBundle))
      setSaveState(nextBundle ? 'saved' : 'idle')
    }
    client.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      return load(data?.session ?? null)
    }).catch(error => { if (active) setNotice(error.message) })
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      load(nextSession).catch(error => setNotice(error.message))
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [client, fixtureMode, reference])

  function change(match, patch) {
    try {
      setDraft(current => updateKoPredictorDraft(current, match, patch))
      setSaveState('dirty')
      setNotice(null)
    } catch (error) {
      setNotice(error.message)
      setSaveState('error')
    }
  }

  async function save() {
    if (!session?.user) {
      setNotice('Sign in to save KO Predictor entries. This competition is separate from the Original Predictor.')
      return
    }
    if (fixtureMode) {
      setSaveState('saved')
      setNotice('Visual fixture saved separately.')
      return
    }
    setSaving(true)
    setSaveState('saving')
    try {
      const result = await saveMyKoPredictionBundle(client, {
        tournamentId: reference.tournamentId,
        expectedRevision: bundle?.revision ?? 0,
        predictions: buildKoPredictorRows(reference, draft),
      })
      setBundle(previous => ({ ...(previous ?? {}), revision: result.revision }))
      setSaveState('saved')
      setNotice(`KO Predictor saved separately at revision ${result.revision}.`)
    } catch (error) {
      setNotice(error.message)
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KoPredictorMatchCentre
      reference={reference}
      draft={draft}
      summary={summary}
      standing={standing}
      saveState={saveState}
      signedIn={Boolean(session?.user)}
      notice={notice}
      saving={saving}
      onChange={change}
      onSave={save}
    />
  )
}
