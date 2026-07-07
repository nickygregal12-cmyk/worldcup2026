import { useEffect } from 'react'
import { Icon } from '../design-system/index.jsx'
import styles from './Welcome.module.css'

const STEPS = Object.freeze([
  Object.freeze({ title: 'Predict', description: 'Call every group score, then pick your bracket winners.' }),
  Object.freeze({ title: 'Score', description: 'Earn points for every result you get right.' }),
  Object.freeze({ title: 'Compare', description: 'Track your rank against mates in private leagues.' }),
])

export default function Welcome({ theme }) {
  useEffect(() => {
    document.title = 'Welcome · Euro 2028 Predictor'
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Euro 2028</span>
        <button
          type="button"
          className={styles.themeButton}
          onClick={theme.toggleTheme}
          aria-label={`Switch to ${theme.resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Icon name={theme.resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
      </header>

      <main className={styles.welcome}>
        <section className={styles.card} aria-labelledby="welcome-heading">
          <span className={styles.eyebrow}>You&apos;re in</span>
          <h1 id="welcome-heading">Let&apos;s get your predictions started</h1>
          <p className={styles.lede}>Three quick things before your first pick.</p>

          <div className={styles.steps}>
            {STEPS.map(step => (
              <div className={styles.step} key={step.title}>
                <span className={styles.stepNumber}>{STEPS.indexOf(step) + 1}</span>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepDescription}>{step.description}</span>
              </div>
            ))}
          </div>

          <a className={styles.primaryButton} href="#/groups">Start your predictions</a>
          <a className={styles.secondaryLink} href="#/how-to-play">
            Want the full rules first? Read How to Play
            <Icon name="chevron" size={13} />
          </a>
        </section>
      </main>
    </div>
  )
}
