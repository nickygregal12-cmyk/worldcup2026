import { useCallback, useEffect, useMemo, useState } from 'react'
import AccountDashboard, { AccountSignInForms } from './AccountDashboard.jsx'
import {
  buildAuthRedirectUrl,
  getEmailForSession,
  loadOwnProfile,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateOwnDisplayName,
  updatePassword,
} from './euroAuthService.js'
import { validateDisplayName, validateEmail, validatePassword, validatePasswordConfirmation } from './authValidation.js'
import { ACCOUNT_STATS_DEFAULT, buildAccountLifecycle } from './accountAccessModel.js'
import { clearMyOriginalPredictions, loadAccountDashboard } from './accountAccessService.js'

function initialMode() {
  if (typeof window === 'undefined') return 'login'
  return new URLSearchParams(window.location.search).get('auth') === 'update-password' ? 'update-password' : 'login'
}

function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid login credentials/i.test(message)) return 'The email address or password is incorrect.'
  if (/email rate limit/i.test(message)) return 'Too many emails were requested. Please try again later.'
  if (/database error saving new user/i.test(message)) return 'The account could not be created. Check that the display name is still available.'
  if (/globally locked|global lock/i.test(message)) return 'The Original Predictor is already locked.'
  if (/revision/i.test(message)) return 'Your predictions changed while this action was running. Reload and try again.'
  return message
}

export default function AccountAccess({ client, reference, tournament = null, lifecycle: providedLifecycle = null }) {
  const [mode, setModeState] = useState(initialMode)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingSession, setLoadingSession] = useState(Boolean(client))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [guestTransferRequested, setGuestTransferRequested] = useState(false)
  const [dashboard, setDashboard] = useState({ status: 'idle', stats: ACCOUNT_STATS_DEFAULT, predictionBundle: null })

  const isRecovery = mode === 'update-password'
  const emailAddress = useMemo(() => getEmailForSession(session), [session])
  const accountLifecycle = useMemo(() => providedLifecycle ?? buildAccountLifecycle(tournament), [providedLifecycle, tournament])

  const setMode = value => {
    setModeState(value)
    setNotice(null)
  }

  const refreshDashboard = useCallback(async () => {
    if (!client || !reference?.tournamentId || !session?.user?.id) return
    setDashboard(previous => ({ ...previous, status: 'loading' }))
    try {
      const nextDashboard = await loadAccountDashboard(client, { tournamentId: reference.tournamentId, userId: session.user.id })
      setDashboard({ status: nextDashboard.errors.length ? 'partial' : 'ready', ...nextDashboard })
      if (nextDashboard.errors.length) setNotice({ tone: 'danger', message: `Account stats partially loaded: ${nextDashboard.errors.join(' ')}` })
    } catch (error) {
      setDashboard({ status: 'error', stats: ACCOUNT_STATS_DEFAULT, predictionBundle: null })
      setNotice({ tone: 'danger', message: messageForError(error) })
    }
  }, [client, reference, session])

  useEffect(() => {
    if (!client) return undefined
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setNotice({ tone: 'danger', message: messageForError(error) })
      setSession(data?.session || null)
      setLoadingSession(false)
    })
    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoadingSession(false)
      if (event === 'PASSWORD_RECOVERY') setModeState('update-password')
      if (event === 'SIGNED_OUT') {
        setProfile(null); setProfileName(''); setGuestTransferRequested(false)
        setDashboard({ status: 'idle', stats: ACCOUNT_STATS_DEFAULT, predictionBundle: null })
      }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!client || !session?.user) return undefined
    let active = true
    loadOwnProfile(client)
      .then(nextProfile => { if (active) { setProfile(nextProfile); setProfileName(nextProfile.display_name) } })
      .catch(error => { if (active) setNotice({ tone: 'danger', message: messageForError(error) }) })
    return () => { active = false }
  }, [client, session])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => { refreshDashboard() }, 0)
    return () => globalThis.clearTimeout(timer)
  }, [refreshDashboard])

  const run = async action => {
    setBusy(true); setNotice(null)
    try { await action() } catch (error) { setNotice({ tone: 'danger', message: messageForError(error) }) } finally { setBusy(false) }
  }

  const submitLogin = event => {
    event.preventDefault()
    run(async () => {
      const emailCheck = validateEmail(email); const passwordCheck = validatePassword(password)
      if (!emailCheck.valid) throw new Error(emailCheck.error)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)
      await signInWithEmail(client, { email, password })
      setPassword(''); setGuestTransferRequested(true)
      setNotice({ tone: 'safe', message: 'Signed in successfully. Saved predictions on this device can be kept after sign-in.' })
    })
  }

  const submitRegistration = event => {
    event.preventDefault()
    run(async () => {
      const nameCheck = validateDisplayName(displayName); const emailCheck = validateEmail(email)
      const passwordCheck = validatePassword(password); const confirmationCheck = validatePasswordConfirmation(password, confirmation)
      if (!nameCheck.valid) throw new Error(nameCheck.error)
      if (!emailCheck.valid) throw new Error(emailCheck.error)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)
      if (!confirmationCheck.valid) throw new Error(confirmationCheck.error)
      const result = await signUpWithEmail(client, { email, password, displayName, redirectTo: buildAuthRedirectUrl() })
      setPassword(''); setConfirmation('')
      if (result.session) setGuestTransferRequested(true)
      setNotice({ tone: 'safe', message: result.session ? 'Account created and signed in. Saved predictions on this device can be kept after sign-up.' : 'Account created. Check your email to confirm it before signing in.' })
    })
  }

  const submitResetRequest = event => { event.preventDefault(); run(() => requestPasswordReset(client, { email }).then(() => setNotice({ tone: 'safe', message: 'Password reset email requested. Check your inbox and spam folder.' }))) }

  const submitNewPassword = event => {
    event.preventDefault()
    run(async () => {
      const passwordCheck = validatePassword(password); const confirmationCheck = validatePasswordConfirmation(password, confirmation)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)
      if (!confirmationCheck.valid) throw new Error(confirmationCheck.error)
      await updatePassword(client, password)
      setPassword(''); setConfirmation(''); setModeState('login')
      if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname)
      setNotice({ tone: 'safe', message: 'Password updated successfully.' })
    })
  }

  const submitProfile = event => {
    event.preventDefault()
    run(async () => {
      const nextProfile = await updateOwnDisplayName(client, profileName)
      setProfile(nextProfile); setProfileName(nextProfile.display_name)
      setNotice({ tone: 'safe', message: 'Display name updated.' })
    })
  }

  const confirmSignOut = () => run(async () => { await signOut(client); setSignOutConfirmOpen(false); setNotice({ tone: 'safe', message: 'Signed out. Guest predictions saved on this device were not removed.' }) })
  const requestPasswordChange = () => run(async () => { await requestPasswordReset(client, { email: emailAddress }); setNotice({ tone: 'safe', message: 'Password reset email requested. Check your inbox and spam folder.' }) })
  const confirmClearPredictions = () => run(async () => {
    if (!accountLifecycle.clearPredictionsAvailable) throw new Error('The Original Predictor is already locked.')
    const result = await clearMyOriginalPredictions(client, { tournamentId: reference.tournamentId, currentRevision: dashboard.predictionBundle?.revision ?? 0 })
    setClearConfirmOpen(false); await refreshDashboard()
    setNotice({ tone: 'safe', message: `Original Predictor cleared. Saved rows now: ${result.savedPredictionCount}.` })
  })

  if (loadingSession) return <section className="foundation-panel auth-foundation" aria-busy="true"><span className="foundation-kicker">Euro account</span><h2>Checking your session…</h2></section>

  if (session?.user && !isRecovery) {
    return <AccountDashboard client={client} reference={reference} session={session} profile={profile} profileName={profileName} setProfileName={setProfileName} emailAddress={emailAddress} busy={busy} notice={notice} dashboard={dashboard} accountLifecycle={accountLifecycle} signOutConfirmOpen={signOutConfirmOpen} setSignOutConfirmOpen={setSignOutConfirmOpen} clearConfirmOpen={clearConfirmOpen} setClearConfirmOpen={setClearConfirmOpen} guestTransferRequested={guestTransferRequested} setGuestTransferRequested={setGuestTransferRequested} refreshDashboard={refreshDashboard} submitProfile={submitProfile} confirmSignOut={confirmSignOut} confirmClearPredictions={confirmClearPredictions} requestPasswordChange={requestPasswordChange} />
  }

  return <AccountSignInForms mode={mode} setMode={setMode} notice={notice} busy={busy} email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirmation={confirmation} setConfirmation={setConfirmation} displayName={displayName} setDisplayName={setDisplayName} submitLogin={submitLogin} submitRegistration={submitRegistration} submitResetRequest={submitResetRequest} submitNewPassword={submitNewPassword} isRecovery={isRecovery} />
}
