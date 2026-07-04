// 공통 UI 조각 — 클레이모피즘.
//
// ⚠️ 텍스트 가독성 원칙 (테마 4종 공통) — 새 UI 만들 때 반드시 지킬 것:
//  1) 바탕(var(--surface)/배경) 위 글자 → var(--ink) / var(--ink-soft) 만 사용 (테마별 자동 반전).
//  2) 캔디색(accent) 위 글자 → 고정색만. 진한색(grape/coral/mint/sky/pink)=흰색,
//     밝은색(lemon)=고정 진한색(ON_LIGHT). 캔디색 위에 var(--ink)(테마 반전) 절대 금지.
import { teamById } from '../config/teams'

// 밝은 accent(레몬 등) 위에 쓰는 고정 진한 글자색
export const ON_LIGHT = '#4a3410'

export function Button({ children, className = '', variant = 'primary', ...rest }) {
  const V = {
    primary: { bg: 'var(--c-grape)', color: '#fff' },
    danger: { bg: 'var(--c-coral)', color: '#fff' },
    ok: { bg: 'var(--c-mint)', color: '#fff' },
    warn: { bg: 'var(--c-lemon)', color: ON_LIGHT }, // 밝은 배경 → 고정 진한색
    ghost: { bg: 'var(--surface-2)', color: 'var(--ink)' }, // 중립 바탕색이라 테마변수 OK
  }[variant]
  return (
    <button
      className={`clay-btn font-display px-5 py-3 text-xl ${className}`}
      style={{ background: V.bg, color: V.color }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`clay p-5 ${className}`} style={{ background: 'var(--surface)' }}>
      {children}
    </div>
  )
}

export function TeamBadge({ teamId, className = '' }) {
  const t = teamById(teamId)
  if (!t) return <span className={`text-[var(--ink-soft)] ${className}`}>무소속</span>
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${className}`}
      style={{ background: t.color, color: '#fff' }}
    >
      {t.emoji} {t.name}
    </span>
  )
}

// color 는 항상 흰 글자가 읽히는 '진한' 캔디색만 넘길 것.
export function Pill({ children, color = '#8a79b5' }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold"
      style={{ background: color, color: '#fff' }}
    >
      {children}
    </span>
  )
}

export function PhaseTag({ status }) {
  const map = {
    staged: ['대기', '#8a79b5'], // 흰 글자가 읽히는 중간 보라
    open: ['진행중', 'var(--c-mint)'],
    reveal: ['공개', 'var(--c-coral)'],
  }
  const [label, color] = map[status] || map.staged
  return <Pill color={color}>{label}</Pill>
}
