import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <section style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '32px 16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: 560, textAlign: 'center', padding: '36px 24px' }}>
        <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-muted)' }}>404</p>
        <h1 style={{ margin: '6px 0 10px' }}>Page not found</h1>
        <p style={{ margin: '0 auto 24px', maxWidth: 420, color: 'var(--text-secondary)' }}>
          That page may have moved, or the link may be incorrect.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/">Go to Home</Link>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    </section>
  )
}
