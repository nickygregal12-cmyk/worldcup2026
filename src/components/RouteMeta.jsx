import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://wc26predictor1.netlify.app'

const ROUTE_META = {
  '/': ['WC26 Predictor', 'Follow the World Cup 2026 predictor, live scores, points and league standings.'],
  '/predictions': ['Group Predictions | WC26 Predictor', 'View World Cup 2026 group predictions, results and live predicted tables.'],
  '/knockout': ['Tournament Bracket | WC26 Predictor', 'Follow your original World Cup 2026 tournament bracket and round progression.'],
  '/ko-predictor': ['KO Match Predictor | WC26 Predictor', 'Predict every World Cup 2026 knockout match as each round opens.'],
  '/leaderboard': ['Leaderboard | WC26 Predictor', 'See the overall WC26 Predictor rankings and top scorers.'],
  '/leagues': ['My Leagues | WC26 Predictor', 'View your private World Cup predictor leagues and standings.'],
  '/awards': ['Tournament Awards | WC26 Predictor', 'View World Cup 2026 award and tournament total predictions.'],
  '/how-to-play': ['How to Play | WC26 Predictor', 'Read the WC26 Predictor scoring rules, lock dates and frequently asked questions.'],
  '/profile': ['Profile | WC26 Predictor', 'Manage your WC26 Predictor profile, settings, badges and history.'],
  '/points': ['Points Breakdown | WC26 Predictor', 'See a detailed breakdown of your World Cup predictor points.'],
  '/stats': ['Tournament Stats | WC26 Predictor', 'Explore World Cup 2026 predictor community statistics.'],
  '/login': ['Sign In | WC26 Predictor', 'Sign in to WC26 Predictor.'],
  '/register': ['Create Account | WC26 Predictor', 'Create your free WC26 Predictor account.'],
  '/reset-password': ['Reset Password | WC26 Predictor', 'Reset your WC26 Predictor password.'],
}

function upsertMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    const [name, key] = attribute
    element.setAttribute(name, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', value)
}

export default function RouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const exact = ROUTE_META[pathname]
    const dynamic = pathname.startsWith('/match/')
      ? ['Match Stats | WC26 Predictor', 'View match statistics and predictor insights.']
      : pathname.startsWith('/league/')
        ? ['League | WC26 Predictor', 'View a WC26 Predictor league.']
        : pathname.startsWith('/h2h/')
          ? ['Head to Head | WC26 Predictor', 'Compare two WC26 Predictor players.']
          : pathname.startsWith('/points/')
            ? ['Points Breakdown | WC26 Predictor', 'View a detailed WC26 Predictor points breakdown.']
            : null

    const [title, description] = exact || dynamic || ['Page Not Found | WC26 Predictor', 'The requested WC26 Predictor page could not be found.']
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`

    document.title = title
    upsertMeta('meta[name="description"]', ['name', 'description'], description)
    upsertMeta('meta[property="og:title"]', ['property', 'og:title'], title)
    upsertMeta('meta[property="og:description"]', ['property', 'og:description'], description)
    upsertMeta('meta[property="og:url"]', ['property', 'og:url'], canonicalUrl)
    upsertMeta('meta[name="twitter:title"]', ['name', 'twitter:title'], title)
    upsertMeta('meta[name="twitter:description"]', ['name', 'twitter:description'], description)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [pathname])

  return null
}
