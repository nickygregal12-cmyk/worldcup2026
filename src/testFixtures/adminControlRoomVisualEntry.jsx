import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminControlRoomVisualFixture from './AdminControlRoomVisualFixture.jsx'
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

const params = new URLSearchParams(window.location.search)
const theme = params.get('theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = theme
document.documentElement.style.colorScheme = theme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AdminControlRoomVisualFixture /></React.StrictMode>,
)
