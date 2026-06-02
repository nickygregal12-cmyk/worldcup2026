// Reusable loading, error, and empty states

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      padding: '40px 20px',
    }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{message}</div>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div style={{
      minHeight: '40vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      padding: '40px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px' }}>😕</div>
      <div>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
          {message}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Check your connection and try again
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-primary"
          style={{ marginTop: '4px' }}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      <div style={{ fontSize: '40px' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{title}</div>
        {desc && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      {action}
    </div>
  )
}

// Skeleton card for loading placeholders
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '16px', borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            marginBottom: i < rows - 1 ? '12px' : 0,
            width: i === 0 ? '60%' : i === rows - 1 ? '40%' : '100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  )
}
