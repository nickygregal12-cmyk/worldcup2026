import { useEffect, useMemo, useState } from 'react'
import GuestAccountTransfer from '../guest/GuestAccountTransfer.jsx'
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
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from './authValidation.js'

function initialMode() {
  if (typeof window === 'undefined') return 'login'
  return new URLSearchParams(window.location.search).get('auth') === 'update-password'
    ? 'update-password'
    : 'login'
}

function messageForError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid login credentials/i.test(message)) return 'The email address or password is incorrect.'
  if (/email rate limit/i.test(message)) return 'Too many emails were requested. Please try again later.'
  if (/database error saving new user/i.test(message)) {
    return 'The account could not be created. Check that the display name is still available.'
  }
  return message
}

function AuthNotice({ notice }) {
  if (!notice) return null
  return (
    <p className={`auth-notice auth-notice--${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>
      {notice.message}
    </p>
  )
}

function TextField({ id, label, type = 'text', value, onChange, autoComplete, minLength }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </label>
  )
}

export default function EuroAuthFoundation({ client, reference }) {
  const [mode, setMode] = useState(initialMode)
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

  const isRecovery = mode === 'update-password'
  const emailAddress = useMemo(() => getEmailForSession(session), [session])

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
      if (event === 'PASSWORD_RECOVERY') setMode('update-password')
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setProfileName('')
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!client || !session?.user) return undefined

    let active = true
    loadOwnProfile(client)
      .then(nextProfile => {
        if (!active) return
        setProfile(nextProfile)
        setProfileName(nextProfile.display_name)
      })
      .catch(error => {
        if (active) setNotice({ tone: 'danger', message: messageForError(error) })
      })

    return () => {
      active = false
    }
  }, [client, session])

  const run = async action => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
    } catch (error) {
      setNotice({ tone: 'danger', message: messageForError(error) })
    } finally {
      setBusy(false)
    }
  }

  const submitLogin = event => {
    event.preventDefault()
    run(async () => {
      const emailCheck = validateEmail(email)
      const passwordCheck = validatePassword(password)
      if (!emailCheck.valid) throw new Error(emailCheck.error)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)

      await signInWithEmail(client, { email, password })
      setPassword('')
      setNotice({ tone: 'safe', message: 'Signed in successfully. Any browser predictions are still safe on this device.' })
    })
  }

  const submitRegistration = event => {
    event.preventDefault()
    run(async () => {
      const nameCheck = validateDisplayName(displayName)
      const emailCheck = validateEmail(email)
      const passwordCheck = validatePassword(password)
      const confirmationCheck = validatePasswordConfirmation(password, confirmation)
      if (!nameCheck.valid) throw new Error(nameCheck.error)
      if (!emailCheck.valid) throw new Error(emailCheck.error)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)
      if (!confirmationCheck.valid) throw new Error(confirmationCheck.error)

      const result = await signUpWithEmail(client, {
        email,
        password,
        displayName,
        redirectTo: buildAuthRedirectUrl(),
      })

      setPassword('')
      setConfirmation('')
      setNotice({
        tone: 'safe',
        message: result.session
          ? 'Account created and signed in. Any saved browser predictions are ready to add to this account.'
          : 'Account created. Check your email to confirm it before signing in.',
      })
    })
  }

  const submitResetRequest = event => {
    event.preventDefault()
    run(async () => {
      await requestPasswordReset(client, { email })
      setNotice({ tone: 'safe', message: 'Password reset email requested. Check your inbox and spam folder.' })
    })
  }

  const submitNewPassword = event => {
    event.preventDefault()
    run(async () => {
      const passwordCheck = validatePassword(password)
      const confirmationCheck = validatePasswordConfirmation(password, confirmation)
      if (!passwordCheck.valid) throw new Error(passwordCheck.error)
      if (!confirmationCheck.valid) throw new Error(confirmationCheck.error)

      await updatePassword(client, password)
      setPassword('')
      setConfirmation('')
      setMode('login')
      if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname)
      setNotice({ tone: 'safe', message: 'Password updated successfully.' })
    })
  }

  const submitProfile = event => {
    event.preventDefault()
    run(async () => {
      const nextProfile = await updateOwnDisplayName(client, profileName)
      setProfile(nextProfile)
      setProfileName(nextProfile.display_name)
      setNotice({ tone: 'safe', message: 'Display name updated.' })
    })
  }

  const handleSignOut = () => run(async () => {
    await signOut(client)
    setNotice({ tone: 'safe', message: 'Signed out. The browser-only guest draft was not removed.' })
  })

  if (loadingSession) {
    return (
      <section className="foundation-panel auth-foundation" aria-busy="true">
        <span className="foundation-kicker">Euro account</span>
        <h2>Checking your session…</h2>
      </section>
    )
  }

  if (session?.user && !isRecovery) {
    return (
      <section className="foundation-panel auth-foundation">
        <div className="foundation-section-heading auth-foundation__heading">
          <div>
            <span className="foundation-kicker">Euro account</span>
            <h2>Signed in as {profile?.display_name || emailAddress}</h2>
            <p className="foundation-panel-copy">
              Manage the display name used on leaderboards and shared predictions. Your email remains private.
            </p>
          </div>
          <button className="foundation-secondary-button" type="button" onClick={handleSignOut} disabled={busy}>
            Sign out
          </button>
        </div>

        <div className="auth-account-grid">
          <form className="auth-form" onSubmit={submitProfile}>
            <TextField
              id="profile-display-name"
              label="Display name"
              value={profileName}
              onChange={setProfileName}
              autoComplete="nickname"
              minLength={3}
            />
            <button type="submit" disabled={busy || !profile}>Update display name</button>
          </form>
          <div className="auth-account-summary">
            <span>Email</span>
            <strong>{emailAddress}</strong>
            <span>Profile privacy</span>
            <strong>Private to your account</strong>
          </div>
        </div>
        {reference && <GuestAccountTransfer client={client} reference={reference} userId={session.user.id} />}
        <AuthNotice notice={notice} />
      </section>
    )
  }

  return (
    <section className="foundation-panel auth-foundation">
      <div className="foundation-section-heading auth-foundation__heading">
        <div>
          <span className="foundation-kicker">Euro account</span>
          <h2>{isRecovery ? 'Choose a new password' : 'Create or access your Euro account'}</h2>
          <p className="foundation-panel-copy">
            Your guest draft remains browser-only. Signing in does not upload, replace or clear it.
          </p>
        </div>
      </div>

      {!isRecovery && (
        <div className="auth-mode-tabs" role="tablist" aria-label="Account options">
          {[
            ['login', 'Sign in'],
            ['register', 'Create account'],
            ['forgot', 'Reset password'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? 'is-active' : ''}
              onClick={() => {
                setMode(value)
                setNotice(null)
              }}
              role="tab"
              aria-selected={mode === value}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'login' && (
        <form className="auth-form" onSubmit={submitLogin}>
          <TextField id="login-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <TextField id="login-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" minLength={8} />
          <button type="submit" disabled={busy}>Sign in</button>
        </form>
      )}

      {mode === 'register' && (
        <form className="auth-form" onSubmit={submitRegistration}>
          <TextField id="register-name" label="Display name" value={displayName} onChange={setDisplayName} autoComplete="nickname" minLength={3} />
          <TextField id="register-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <TextField id="register-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
          <TextField id="register-confirmation" label="Confirm password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} />
          <button type="submit" disabled={busy}>Create account</button>
        </form>
      )}

      {mode === 'forgot' && (
        <form className="auth-form" onSubmit={submitResetRequest}>
          <TextField id="reset-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <button type="submit" disabled={busy}>Send reset email</button>
        </form>
      )}

      {mode === 'update-password' && (
        <form className="auth-form" onSubmit={submitNewPassword}>
          <TextField id="new-password" label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
          <TextField id="new-password-confirmation" label="Confirm new password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} />
          <button type="submit" disabled={busy}>Update password</button>
        </form>
      )}

      <AuthNotice notice={notice} />
    </section>
  )
}
