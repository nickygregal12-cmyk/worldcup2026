// Subtle haptic feedback for key actions — makes the PWA feel native
// Safe no-op on devices/browsers without vibration support
export const haptic = {
  // Light tap — score saved, reaction toggled
  tap: () => { try { navigator.vibrate?.(10) } catch {} },
  // Medium — joker placed, pick confirmed
  medium: () => { try { navigator.vibrate?.(20) } catch {} },
  // Success pattern — group complete, bracket done
  success: () => { try { navigator.vibrate?.([15, 30, 15]) } catch {} },
  // Warning — lock imminent, error
  warning: () => { try { navigator.vibrate?.([30, 50, 30]) } catch {} },
}
