import { useState, useEffect } from 'react'

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS
    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (dismissed) return

    if (ios) {
      // Show iOS instructions after 30 seconds
      setTimeout(() => setShowBanner(true), 30000)
    } else {
      // Listen for Chrome/Android install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => setShowBanner(true), 5000)
      })
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (!showBanner || isInstalled) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '16px',
      right: '16px',
      background: '#003087',
      color: 'white',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.4s ease forwards',
    }}>
      <div style={{ fontSize: '32px' }}>⚽</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>
          Add to Home Screen
        </div>
        {isIOS ? (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Install WC26 Predictor as an app
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {!isIOS && (
          <button
            onClick={handleInstall}
            style={{
              background: '#00c853',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
