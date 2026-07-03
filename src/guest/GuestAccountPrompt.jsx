import { LinkButton } from '../design-system/index.jsx'
import styles from './GuestAccountPrompt.module.css'

export default function GuestAccountPrompt({ completed, total, label = 'predictions' }) {
  if (!Number.isFinite(completed) || completed <= 0) return null
  return (
    <aside className={styles.prompt} aria-label="Save guest predictions to an account">
      <div>
        <strong>{completed}/{total} {label} saved on this device</strong>
        <span>Create an account when you are ready to score points, join leagues and keep your entries across devices.</span>
      </div>
      <LinkButton href="#/account" variant="secondary" icon="profile">Create or sign in</LinkButton>
    </aside>
  )
}
