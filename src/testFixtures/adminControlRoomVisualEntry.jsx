import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminControlRoomVisualFixture from './AdminControlRoomVisualFixture.jsx'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../design/tokens.css'
import '../design/typography.css'
import '../styles/feature-compat.css'
import '../styles/app.css'

const params = new URLSearchParams(window.location.search)
const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = theme
document.documentElement.style.colorScheme = theme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AdminControlRoomVisualFixture /></React.StrictMode>,
)
