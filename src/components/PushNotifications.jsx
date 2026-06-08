import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from '../store/index.js'

const VAPID_PUBLIC_KEY = 'BN_FGr0PzDqeHLmnZNgviKU6KvSWcZh5U9RZdzcZMfKQUnJFL-s-tNaMWSyZNyshmwXmkrlWTpGlSD8PiPZsv8E'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushNotifications() {
  const { user, isLoading } = useAuthStore()
  const [status, setStatus] = useState('idle') // idle | requesting | subscribed | denied | unsupported
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isLoading || !user) return
    // Small delay to let service worker register
    const t = setTimeout(checkStatus, 1500)
    return () => clearTimeout(t)
  }, [user?.id, isLoading])

  const checkStatus = async () => {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    const permission = Notification.permission
    if (permission === 'denied') { setStatus('denied'); return }
    if (permission === 'granted') {
      // Check if we have a subscription stored
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { setStatus('subscribed'); return }
    }

    // Check if user already dismissed the prompt
    const dismissedAt = localStorage.getItem('push-prompt-dismissed')
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) { setDismissed(true); return } // re-prompt after 7 days
    }

    setStatus('idle')
  }

  const subscribe = async () => {
    setStatus('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const key = sub.getKey('p256dh')
      const auth = sub.getKey('auth')

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      }, { onConflict: 'user_id,endpoint' })

      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscription failed:', err)
      setStatus('idle')
    }
  }

  const dismiss = () => {
    localStorage.setItem('push-prompt-dismissed', Date.now().toString())
    setDismissed(true)
  }

  // Don't show if unsupported, subscribed, denied, or dismissed
  if (!user || isLoading || status === 'unsupported' || status === 'subscribed' || status === 'denied' || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)',
      left: '12px', right: '12px',
      background: 'var(--scottish-navy)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      zIndex: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ fontSize: '28px', flexShrink: 0 }}>⚽</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: 'white', marginBottom: '2px' }}>
          Get match result notifications
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
          We'll let you know how you scored — only if you haven't checked already
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={subscribe}
          disabled={status === 'requesting'}
          style={{
            background: 'var(--accent-green)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-full)',
            padding: '6px 14px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          {status === 'requesting' ? '...' : '✓ Yes please'}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
            border: 'none', borderRadius: 'var(--radius-full)',
            padding: '6px 14px', fontSize: '11px', fontWeight: '600',
            cursor: 'pointer', textAlign: 'center',
          }}>
          Not now
        </button>
      </div>
    </div>
  )
}
