import { hasStage14ErrorFlag } from './stage14ErrorFlag.js'

export default function Stage14ErrorFixture() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  if (!hasStage14ErrorFlag()) return null
  throw new Error('Stage 14 local error-boundary fixture')
}
