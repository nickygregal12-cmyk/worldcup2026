import { createStage13dVisualClient } from './stage13dVisualFixture.js'

const response = (data, error = null) => Promise.resolve({ data, error })

/**
 * The visual browser tier mounts the real app with deterministic, read-only data.
 * Signed-in mode exercises leagues and player surfaces; guest mode keeps the
 * Original Predictor editable so the bracket probe can drive every real control.
 */
export function createProductVisualClient({ signedIn = true } = {}) {
  const client = createStage13dVisualClient()
  if (signedIn) return client

  return Object.freeze({
    ...client,
    auth: Object.freeze({
      getSession: () => response({ session: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    }),
  })
}
