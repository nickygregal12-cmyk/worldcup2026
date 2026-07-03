import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import {
  ChartNoAxesColumn,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Ellipsis,
  GitBranch,
  Home,
  Info,
  ListChecks,
  LockKeyhole,
  LoaderCircle,
  Save,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  TriangleAlert,
  UnlockKeyhole,
  Trophy,
  Users,
  X,
} from 'lucide-react'

const ICONS = Object.freeze({
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
  refresh: RefreshCw,
  alert: TriangleAlert,
  check: Check,
  clock: Clock3,
  loader: LoaderCircle,
  lock: LockKeyhole,
  unlock: UnlockKeyhole,
  save: Save,
})

export default function Icon({ name, size = 22, strokeWidth = 1.9, className = '' }) {
  const Component = ICONS[name] ?? Info
  return <Component aria-hidden="true" focusable="false" size={size} strokeWidth={strokeWidth} className={className} />
}
