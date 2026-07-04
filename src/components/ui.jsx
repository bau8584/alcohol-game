// 공통 UI 조각들.
import { teamById } from '../config/teams'

export function Button({ children, className = '', variant = 'primary', ...rest }) {
  const styles = {
    primary: 'bg-indigo-500 hover:bg-indigo-400 text-white',
    ghost: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warn: 'bg-amber-500 hover:bg-amber-400 text-black',
    ok: 'bg-emerald-500 hover:bg-emerald-400 text-black',
  }
  return (
    <button
      className={`rounded-xl px-4 py-3 font-bold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 p-4 ${className}`}>{children}</div>
  )
}

export function TeamBadge({ teamId, className = '' }) {
  const t = teamById(teamId)
  if (!t) return <span className={`text-white/50 ${className}`}>무소속</span>
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold ${className}`}
      style={{ background: t.color + '22', color: t.color }}
    >
      {t.emoji} {t.name}
    </span>
  )
}

export function Pill({ children, color = '#94a3b8' }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ background: color + '22', color }}
    >
      {children}
    </span>
  )
}

// 게임 진행 단계 라벨
export function PhaseTag({ status }) {
  const map = {
    staged: ['대기', '#94a3b8'],
    open: ['진행중', '#22c55e'],
    reveal: ['공개', '#f59e0b'],
  }
  const [label, color] = map[status] || map.staged
  return <Pill color={color}>● {label}</Pill>
}
