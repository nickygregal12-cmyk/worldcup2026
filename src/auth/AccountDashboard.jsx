import { Button, Card, ConfirmDialog, LinkButton } from '../design-system/index.jsx'
import GuestAccountTransfer from '../guest/GuestAccountTransfer.jsx'
import { ACCOUNT_STATS_DEFAULT, initialForDisplayName, shouldShowGuestTransferModal } from './accountAccessModel.js'
import styles from './AccountDashboard.module.css'

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

function AuthNotice({ notice }) {
  if (!notice) return null
  return <p className={`auth-notice auth-notice--${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>{notice.message}</p>
}

function AccountStatsCard({ stats }) {
  const safeStats = stats ?? ACCOUNT_STATS_DEFAULT
  return (
    <Card className={styles.card} as="section" aria-labelledby="account-stats-heading">
      <div className={styles.cardHeading}>
        <span className="foundation-kicker">Quick stats</span>
        <h3 id="account-stats-heading">Your prediction snapshot</h3>
      </div>
      <div className={styles.statsGrid}>
        <div><strong>{safeStats.leaguesJoined}</strong><span>Leagues joined</span></div>
        <div><strong>{safeStats.groupPredictionsSaved}/{safeStats.groupPredictionTotal}</strong><span>Group scores saved</span></div>
        <div><strong>{safeStats.groupJokersArmed}/{safeStats.groupJokerTotal}</strong><span>Group jokers armed</span></div>
      </div>
    </Card>
  )
}

function AccountRow({ title, description, action = null, disabled = false }) {
  return (
    <div className={`${styles.row} ${disabled ? styles.disabled : ''}`.trim()}>
      <div><strong>{title}</strong><span>{description}</span></div>
      {action}
    </div>
  )
}

export function AccountSignInForms({ mode, setMode, notice, busy, email, setEmail, password, setPassword, confirmation, setConfirmation, displayName, setDisplayName, submitLogin, submitRegistration, submitResetRequest, submitNewPassword, isRecovery }) {
  return (
    <section className="foundation-panel auth-foundation">
      <div className="foundation-section-heading auth-foundation__heading">
        <div>
          <span className="foundation-kicker">Euro account</span>
          <h2>{isRecovery ? 'Choose a new password' : 'Create or access your Euro account'}</h2>
          <p className="foundation-panel-copy">Your guest draft stays on this device. Signing in does not upload, replace or clear it.</p>
        </div>
      </div>
      {!isRecovery && (
        <div className="auth-mode-tabs" role="tablist" aria-label="Account options">
          {[['login', 'Sign in'], ['register', 'Create account'], ['forgot', 'Reset password']].map(([value, label]) => (
            <button key={value} type="button" className={mode === value ? 'is-active' : ''} onClick={() => setMode(value)} role="tab" aria-selected={mode === value}>{label}</button>
          ))}
        </div>
      )}
      {mode === 'login' && <form className="auth-form" onSubmit={submitLogin}><TextField id="login-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><TextField id="login-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" minLength={8} /><button type="submit" disabled={busy}>Sign in</button></form>}
      {mode === 'register' && <form className="auth-form" onSubmit={submitRegistration}><TextField id="register-name" label="Display name" value={displayName} onChange={setDisplayName} autoComplete="nickname" minLength={3} /><TextField id="register-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><TextField id="register-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} /><TextField id="register-confirmation" label="Confirm password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} /><button type="submit" disabled={busy}>Create account</button></form>}
      {mode === 'forgot' && <form className="auth-form" onSubmit={submitResetRequest}><TextField id="reset-email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><button type="submit" disabled={busy}>Send reset email</button></form>}
      {mode === 'update-password' && <form className="auth-form" onSubmit={submitNewPassword}><TextField id="new-password" label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} /><TextField id="new-password-confirmation" label="Confirm new password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} /><button type="submit" disabled={busy}>Update password</button></form>}
      <AuthNotice notice={notice} />
    </section>
  )
}

export default function AccountDashboard({ client, reference, session, profile, profileName, setProfileName, emailAddress, busy, notice, dashboard, accountLifecycle, signOutConfirmOpen, setSignOutConfirmOpen, clearConfirmOpen, setClearConfirmOpen, guestTransferRequested, setGuestTransferRequested, refreshDashboard, submitProfile, confirmSignOut, confirmClearPredictions, requestPasswordChange }) {
  const showGuestTransfer = shouldShowGuestTransferModal({ requested: guestTransferRequested, session, isRecovery: false })
  const displayLabel = profile?.display_name || emailAddress || 'Euro player'
  const avatarInitial = initialForDisplayName(profile?.display_name, emailAddress)

  return (
    <section className={styles.dashboard}>
      <ConfirmDialog open={signOutConfirmOpen} title="Sign out of Euro 2028 Predictor?" confirmLabel="Sign out" cancelLabel="Stay signed in" tone="danger" busy={busy} onConfirm={confirmSignOut} onCancel={() => setSignOutConfirmOpen(false)}>Guest predictions saved on this device stay here. Predictions already saved to your account stay with your account.</ConfirmDialog>
      <ConfirmDialog open={clearConfirmOpen} title="Clear your Original Predictor predictions?" confirmLabel="Clear predictions" cancelLabel="Keep predictions" tone="danger" busy={busy} onConfirm={confirmClearPredictions} onCancel={() => setClearConfirmOpen(false)}>This clears your saved group scores and pre-tournament bracket picks only. It cannot be undone. Your leagues, account details and KO Predictor entries are not changed.</ConfirmDialog>
      {showGuestTransfer && reference && <GuestAccountTransfer client={client} reference={reference} userId={session.user.id} asDialog open={showGuestTransfer} onClose={() => setGuestTransferRequested(false)} onComplete={() => { setGuestTransferRequested(false); refreshDashboard() }} />}

      <Card className={`${styles.card} ${styles.identityCard}`} as="section" aria-labelledby="account-identity-heading">
        <div className={styles.identityHeader}><div className={styles.avatar} aria-hidden="true">{avatarInitial}</div><div><span className="foundation-kicker">Euro account</span><h2 id="account-identity-heading">{displayLabel}</h2><p>Your email remains private. Your display name is used on leaderboards and shared prediction views.</p></div></div>
        <div className="auth-account-grid"><form className="auth-form" onSubmit={submitProfile}><TextField id="profile-display-name" label="Display name" value={profileName} onChange={setProfileName} autoComplete="nickname" minLength={3} /><Button type="submit" disabled={busy || !profile}>Update display name</Button></form><div className="auth-account-summary"><span>Email</span><strong>{emailAddress}</strong><span>Profile privacy</span><strong>Private to your account</strong></div></div>
      </Card>

      <AccountStatsCard stats={dashboard.stats} />
      <Card className={styles.card} as="section" aria-labelledby="account-security-heading"><div className={styles.cardHeading}><span className="foundation-kicker">Security & preferences</span><h3 id="account-security-heading">Account controls</h3></div><AccountRow title="Change password" description="Send a secure reset link to your email." action={<Button type="button" variant="secondary" onClick={requestPasswordChange} disabled={busy}>Send link</Button>} /><AccountRow title="Match reminders" description="Coming soon — no notification service is active yet." action={<span className={styles.pill}>Coming soon</span>} disabled /><AccountRow title="Daily points update" description="Coming soon — a daily summary after results are scored." action={<span className={styles.pill}>Coming soon</span>} disabled /></Card>
      <Card className={styles.card} as="section" aria-labelledby="account-leagues-heading"><div className={styles.cardHeading}><span className="foundation-kicker">Leagues</span><h3 id="account-leagues-heading">Private competitions</h3></div><AccountRow title="Your leagues" description={`${dashboard.stats?.leaguesJoined ?? 0} joined. Open leagues to create, join or compare standings.`} action={<LinkButton href="#/leagues" variant="secondary">Open leagues</LinkButton>} /></Card>
      <Card className={`${styles.card} ${styles.dangerCard}`} as="section" aria-labelledby="account-danger-heading"><div className={styles.cardHeading}><span className="foundation-kicker">Danger zone</span><h3 id="account-danger-heading">Account actions</h3></div>{accountLifecycle.clearPredictionsAvailable ? <AccountRow title="Clear my predictions" description="Clear Original Predictor group scores and bracket picks before lock. KO Predictor, leagues and account details are untouched." action={<Button type="button" variant="danger" onClick={() => setClearConfirmOpen(true)} disabled={busy}>Clear predictions</Button>} /> : <AccountRow title="Clear my predictions" description="Hidden after lock in the live UI. The Original Predictor is locked." action={<span className={styles.pill}>Locked</span>} disabled />}<AccountRow title="Sign out" description="Guest predictions saved on this device stay here." action={<Button type="button" variant="danger" onClick={() => setSignOutConfirmOpen(true)} disabled={busy}>Sign out</Button>} /></Card>
      <AuthNotice notice={notice} />
    </section>
  )
}
