import { Icon } from '../design-system/index.jsx'
import useNavAutoHide from './useNavAutoHide.js'
import styles from './MobileNav.module.css'

/**
 * The mobile bottom nav — the app shell's, not any page's.
 *
 * Two things landed here at DP-SHELL:
 *
 * 1. The RAISED HOME CIRCLE, per the approved prototype. CLAUDE.md §5 already spoke
 *    of the nav "translating as one unit with the raised Home circle", but no such
 *    circle existed: EuroAppShell emitted an `app-nav-link__home-icon` span that no
 *    stylesheet in the repo ever painted. It is real now, and — this is the part §5
 *    cares about — it is a CHILD of the nav element, lifted by a negative margin
 *    rather than positioned independently. So the transform that hides the bar
 *    carries the circle with it, as one unit, because it cannot do anything else.
 *
 * 2. AUTO-HIDE, per §5. The behaviour is `useNavAutoHide`; all this file does is
 *    carry the answer to the CSS as a data attribute.
 *
 * The nav owns its own CSS Module. It used to be three near-duplicate blocks of
 * `.app-mobile-nav` rules spread across two legacy media queries in app.css.
 */
export default function MobileNav({ destinations, route, moreActive, moreOpen, onMoreOpen }) {
  const hidden = useNavAutoHide()

  return (
    <nav
      className={styles.nav}
      aria-label="Mobile navigation"
      data-nav-hidden={hidden ? 'true' : 'false'}
    >
      {destinations.map(destination => {
        const active = destination.key === route
        const home = destination.home === true
        return (
          <a
            key={destination.key}
            href={destination.hash}
            className={home ? `${styles.item} ${styles.homeItem}` : styles.item}
            aria-current={active ? 'page' : undefined}
          >
            {home
              ? <span className={styles.circle}><Icon name={destination.icon} size={24} /></span>
              : <Icon name={destination.icon} size={22} />}
            <span className={styles.label}>{destination.shortLabel ?? destination.label}</span>
          </a>
        )
      })}

      <button
        type="button"
        className={styles.item}
        aria-current={moreActive ? 'page' : undefined}
        aria-expanded={moreOpen}
        aria-haspopup="dialog"
        onClick={onMoreOpen}
      >
        <Icon name="more" size={22} />
        <span className={styles.label}>More</span>
      </button>
    </nav>
  )
}
