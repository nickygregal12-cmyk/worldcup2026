/**
 * Getting the finished PNG off the device.
 *
 * The house pattern is already set by Leagues.jsx: try `navigator.share`, treat an AbortError as
 * the player simply changing their mind (NOT an error to shout about), and fall back otherwise.
 * The fallback here is a download rather than a clipboard copy, because the artifact is a file.
 *
 * `navigator.canShare({ files })` is the gate that matters, not `navigator.share` alone: desktop
 * Chrome has `share` but refuses files, so feature-detecting the wrong one means a rejected
 * promise on every desktop share instead of a clean download.
 *
 * There is no window.confirm/alert/prompt anywhere in here — the native-controls ratchet forbids
 * them outright, and the caller reports outcomes as an inline notice in the app's own language.
 */
export const SHARE_OUTCOME = Object.freeze({
  SHARED: 'shared',
  DOWNLOADED: 'downloaded',
  CANCELLED: 'cancelled',
})

function canShareFile(file) {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking synchronously can cancel the download in some browsers; one frame is enough.
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

export async function shareBracketImage(blob, { fileName, title, text }) {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title, text })
      return SHARE_OUTCOME.SHARED
    } catch (error) {
      if (error?.name === 'AbortError') return SHARE_OUTCOME.CANCELLED
      // Anything else — a share sheet that failed to open, a permissions refusal — still leaves
      // the player with a perfectly good image, so give them it rather than an apology.
    }
  }

  downloadFile(blob, fileName)
  return SHARE_OUTCOME.DOWNLOADED
}
