import React from 'react'
import ReactDOM from 'react-dom/client'
import { EuroAppRuntime } from '../App.jsx'
import { AppErrorBoundary } from '../observability/index.js'
import { VISUAL_STAGE13D_FOUNDATION } from './stage13dVisualFixture.js'
import { createProductVisualClient } from './productVisualClient.js'
import '@fontsource/public-sans/latin-400.css'
import '@fontsource/public-sans/latin-600.css'
import '@fontsource/public-sans/latin-700.css'
import '@fontsource/public-sans/latin-800.css'
import '@fontsource/big-shoulders-display/latin-700.css'
import '@fontsource/big-shoulders-display/latin-800.css'
import '@fontsource/big-shoulders-display/latin-900.css'
import '../design/tokens.css'
import '../design/typography.css'
import '../styles/feature-compat.css'
import '../styles/app.css'
import '../styles/match-card.css'
import '../styles/groups-predictor.css'
import '../styles/knockout-experiences.css'

const params = new URLSearchParams(window.location.search)
const signedIn = params.get('auth') !== 'guest'
const clientFactory = () => ({
  client: createProductVisualClient({ signedIn }),
  error: null,
})
const appLoader = async () => VISUAL_STAGE13D_FOUNDATION

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <EuroAppRuntime clientFactory={clientFactory} appLoader={appLoader} />
    </AppErrorBoundary>
  </React.StrictMode>,
)
