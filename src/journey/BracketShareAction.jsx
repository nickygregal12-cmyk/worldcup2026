import { useState } from 'react'
import { Button, Icon } from '../design-system/index.jsx'
import { buildBracketShareModel, describeShareReadiness } from './shareImageModel.js'
import { renderBracketShareImage } from './shareImageRenderer.js'
import { SHARE_FILE_NAME, buildShareText } from './shareImageCopy.js'
import { SHARE_OUTCOME, shareBracketImage } from './shareBracketImage.js'
import styles from './BracketShareAction.module.css'

/**
 * The share trigger on the Original Bracket.
 *
 * Not gated on an account. A guest can complete Groups and the bracket, and a guest sharing their
 * card is the growth loop working exactly as intended — the image is painted from the local draft,
 * so it needs no session, no network and no Supabase round trip.
 *
 * Outcomes are reported as an inline notice in the system's own language. `window.alert` is not
 * merely discouraged here, it is banned by the native-controls ratchet, and a share sheet the
 * player dismissed on purpose is not an error worth a dialog anyway.
 */
const NOTICE = Object.freeze({
  [SHARE_OUTCOME.SHARED]: { tone: 'safe', message: 'Bracket shared.' },
  [SHARE_OUTCOME.DOWNLOADED]: { tone: 'safe', message: 'Image saved to your device — send it on from there.' },
  [SHARE_OUTCOME.CANCELLED]: null,
})

export default function BracketShareAction({ reference, draft, preview, includeGroupScores = true }) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const model = buildBracketShareModel({ reference, draft, preview })
  const readiness = describeShareReadiness(model)

  async function share() {
    setBusy(true)
    setNotice(null)
    try {
      const blob = await renderBracketShareImage(model, { includeGroupScores })
      const outcome = await shareBracketImage(blob, { fileName: SHARE_FILE_NAME, ...buildShareText(model) })
      setNotice(NOTICE[outcome])
    } catch {
      setNotice({ tone: 'warning', message: 'The image could not be created. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.share} aria-label="Share your bracket">
      <div className={styles.copy}>
        <h3 className={styles.title}>Share your bracket</h3>
        <p className={styles.body}>
          {readiness.ready
            ? 'Send your predicted champion and full knockout chart to anyone — as an image.'
            : readiness.hint}
        </p>
      </div>

      {/* `icon` is an icon NAME, not an element — Button looks it up, and Icon quietly falls back
          to the info glyph on a miss, so passing <Icon/> here renders a circled "i". */}
      <Button variant="primary" icon="share" loading={busy} disabled={!readiness.ready} onClick={share}>
        {readiness.label}
      </Button>

      {notice && (
        <p className={styles.notice} data-tone={notice.tone} role="status">
          <Icon name={notice.tone === 'safe' ? 'check' : 'alert'} size={16} />
          <span>{notice.message}</span>
        </p>
      )}
    </section>
  )
}
