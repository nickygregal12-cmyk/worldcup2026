import { supabase } from '../lib/supabase.js'

const VAPID_PUBLIC_KEY = 'BN_FGr0PzDqeHLmnZNgviKU6KvSWcZh5U9RZdzcZMfKQUnJFL-s-tNaMWSyZNyshmwXmkrlWTpGlSD8PiPZsv8E'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { error: 'unsupported' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { error: 'denied' }
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const key = sub.getKey('p256dh')
  const auth = sub.getKey('auth')
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
    auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
  }, { onConflict: 'user_id,endpoint' })
  return { ok: true }
}

export async function unsubscribeFromPush(userId) {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  }
}

// No default export — notifications managed via Profile settings toggle
export default function PushNotifications() { return null }
