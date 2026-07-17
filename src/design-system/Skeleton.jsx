import styles from './Skeleton.module.css'

export function SkeletonBlock({ height = 'card', className = '' }) {
  return <span className={`${styles.block} ${styles[height]} ${className}`.trim()} aria-hidden="true" />
}

export default function SkeletonPage({ cards = 2, label = 'Loading content' }) {
  return (
    <div className={styles.page} role="status" aria-busy="true" aria-live="polite">
      <SkeletonBlock height="hero" />
      <div className={styles.grid}>
        {Array.from({ length: cards }, (_, index) => <SkeletonBlock key={index} height="card" />)}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
