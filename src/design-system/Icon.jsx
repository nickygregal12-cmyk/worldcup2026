import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import {
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Copy,
  Ellipsis,
  GitBranch,
  Home,
  Info,
  ListChecks,
  LockKeyhole,
  LoaderCircle,
  Save,
  Share2,
  Moon,
  RefreshCw,
  Radio,
  ShieldCheck,
  Sun,
  TriangleAlert,
  UnlockKeyhole,
  Trophy,
  Users,
  X,
} from 'lucide-react'

// The one mark lucide does not carry. It lives in its own primitive because this
// file is a lucide adapter and the token audit holds it to that — no raw SVG here.
import JokerMark from './JokerMark.jsx'

const ICONS = Object.freeze({
  joker: JokerMark,
  home: Home,
  predict: ListChecks,
  bracket: GitBranch,
  trophy: Trophy,
  leagues: Users,
  results: ChartNoAxesColumn,
  account: CircleUserRound,
  info: Info,
  admin: ShieldCheck,
  more: Ellipsis,
  sun: Sun,
  moon: Moon,
  close: X,
  chevron: ChevronRight,
  'chevron-down': ChevronDown,
  refresh: RefreshCw,
  alert: TriangleAlert,
  check: Check,
  clock: Clock3,
  loader: LoaderCircle,
  lock: LockKeyhole,
  unlock: UnlockKeyhole,
  save: Save,
  share: Share2,
  copy: Copy,
  live: Radio,
})

export default function Icon({ name, size = 22, strokeWidth = 1.9, className = '' }) {
  const Component = ICONS[name] ?? Info
  return <Component aria-hidden="true" focusable="false" size={size} strokeWidth={strokeWidth} className={className} />
}
