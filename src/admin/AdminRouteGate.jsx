import { ADMIN_VISIBILITY_STATUS } from './adminVisibilityModel.js'

export default function AdminRouteGate({ visibility, children }) {
  if (visibility.status === ADMIN_VISIBILITY_STATUS.ALLOWED) return children

  if (visibility.status === ADMIN_VISIBILITY_STATUS.CHECKING) {
    return (
      <section className="foundation-panel" aria-live="polite" data-admin-route-state="checking">
        <span className="foundation-kicker">Secure destination</span>
        <h1>Checking access…</h1>
        <p>Please wait while your account permissions are verified.</p>
      </section>
    )
  }

  const signedOut = visibility.status === ADMIN_VISIBILITY_STATUS.SIGNED_OUT
  const verificationError = visibility.status === ADMIN_VISIBILITY_STATUS.ERROR
  return (
    <section className="foundation-panel" data-admin-route-state={visibility.status}>
      <span className="foundation-kicker">Unavailable destination</span>
      <h1>This page is not available</h1>
      <p>{signedOut ? 'Sign in with an authorised account to continue.' : 'Your account cannot open this destination.'}</p>
      <div className="foundation-action-row">
        <a className="foundation-primary-link" href={signedOut ? '#/account' : '#/'}>{signedOut ? 'Go to sign in' : 'Return home'}</a>
        {verificationError && <button type="button" className="foundation-secondary-button" onClick={visibility.retry}>Check access again</button>}
      </div>
    </section>
  )
}
