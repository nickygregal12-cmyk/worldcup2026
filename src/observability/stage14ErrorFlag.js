export function hasStage14ErrorFlag(href) {
  const target = href ?? (typeof window === 'undefined' ? null : window.location.href)
  if (!target) return false
  return new URL(target).searchParams.get('stage14_error') === '1'
}

export function clearStage14ErrorFlag() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (url.searchParams.get('stage14_error') !== '1') return
  url.searchParams.delete('stage14_error')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}
