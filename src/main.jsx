import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppErrorBoundary, initObservability, Stage14ErrorFixture } from './observability/index.js'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import './design/tokens.css'
import './design/typography.css'
import './styles/feature-compat.css'
import './styles/app.css'
import './styles/match-card.css'
import './styles/groups-predictor.css'
import './styles/knockout-experiences.css'

initObservability()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Stage14ErrorFixture />
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
