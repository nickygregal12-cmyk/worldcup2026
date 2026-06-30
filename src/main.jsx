import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './foundation/foundation.css'

async function retireInheritedServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))

    if ('caches' in window) {
      const cacheNames = await window.caches.keys()
      const inheritedCaches = cacheNames.filter(name => name.startsWith('wc26-'))
      await Promise.all(inheritedCaches.map(name => window.caches.delete(name)))
    }
  } catch (error) {
    console.warn('Could not retire the inherited service worker cleanly.', error)
  }
}

window.addEventListener('load', retireInheritedServiceWorker, { once: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
