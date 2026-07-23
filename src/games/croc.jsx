// 통아저씨 🐊 — 돌아가며 이빨을 누른다. 하나가 '무는 이빨'. 물리면 그 사람 벌칙 🍺.
// 각자 폰 턴제: 내 차례에만 내 폰에서 이빨 탭. 무는 이빨은 미리 저장 안 하고 매 탭마다
// 1/(남은 이빨 수) 확률로 결정 → 사전 조회(치트) 불가 + 실제 장난감처럼 무조건 언젠가 물림.
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'

const DEFAULT_TEETH = 10
const MIN_TEETH = 6
const MAX_TEETH = 16

// 접속자를 joinedAt 순으로 고정 정렬 → 안정적 턴 순서
function turnOrder(players) {
  return players
    .filter((p) => p.connected !== false)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
}

function HostView({ base, meta, players }) {
  const teeth = useValue(`${base}/teeth`) || DEFAULT_TEETH
  const pressed = useValue(`${base}/pressed`) || {}
  const victim = useValue(`${base}/victim`)
  const turnIdx = useValue(`${base}/turnIdx`) || 0
  const staged = meta.roundStatus === 'staged'

  const order = useMemo(() => turnOrder(players), [players])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const cur = order.length ? order[turnIdx % order.length] : null
  const pressedCount = Object.keys(pressed).length
  const setTeeth = (d) => dbSet(`${base}/teeth`, Math.max(MIN_TEETH, Math.min(MAX_TEETH, teeth + d)))

  return (
    <div className="text-center">
      <div className="text-6xl">🐊</div>
      {staged ? (
        <>
          <p className="mt-1 font-display text-lg">통아저씨</p>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>돌아가며 이빨을 눌러요. 무는 이빨에 걸린 사람이 벌칙 🍺</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>이빨 수</span>
            <button onClick={() => setTeeth(-1)} disabled={teeth <= MIN_TEETH} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
            <span className="font-display text-2xl w-10">🦷{teeth}</span>
            <button onClick={() => setTeeth(1)} disabled={teeth >= MAX_TEETH} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
          </div>
          <p className="mt-4 text-sm font-display" style={{ color: 'var(--c-coral)' }}>▶ 시작을 누르면 시작해요 🦷</p>
        </>
      ) : victim ? (
        <div className="mt-2">
          <div className="font-display text-3xl animate-pop" style={{ color: 'var(--c-coral)' }}>💥 {byId[victim]?.nickname || '?'} 물렸다!</div>
          <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>벌칙 한 잔! 🍺 · ‘새 게임’으로 다시</p>
          <TeethGrid teeth={teeth} pressed={pressed} biteTooth={pressed.__bite} />
        </div>
      ) : (
        <div className="mt-2">
          <div className="font-display text-2xl" style={{ color: 'var(--c-sky)' }}>🦷 {cur?.nickname || '?'} 님 차례</div>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{pressedCount}/{teeth} 눌림 · 두근두근…</p>
          <TeethGrid teeth={teeth} pressed={pressed} />
        </div>
      )}
    </div>
  )
}

// 이빨 표시 (읽기 전용) — 눌린 이빨은 접힘, 무는 이빨은 💥
function TeethGrid({ teeth, pressed, biteTooth }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
      {Array.from({ length: teeth }, (_, i) => {
        const bite = biteTooth === i
        const on = pressed[i] !== undefined
        return (
          <div key={i} className="w-10 h-12 rounded-b-xl flex items-center justify-center text-2xl clay-inset"
            style={{ background: bite ? 'var(--c-coral)' : on ? 'var(--surface-2)' : 'var(--surface)', opacity: on && !bite ? 0.4 : 1 }}>
            {bite ? '💥' : on ? '·' : '🦷'}
          </div>
        )
      })}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const teeth = useValue(`${base}/teeth`) || DEFAULT_TEETH
  const pressed = useValue(`${base}/pressed`) || {}
  const victim = useValue(`${base}/victim`)
  const turnIdx = useValue(`${base}/turnIdx`) || 0
  const open = meta.roundStatus === 'open'

  const order = useMemo(() => turnOrder(players), [players])
  const cur = order.length ? order[turnIdx % order.length] : null
  const myTurn = open && !victim && cur?.id === me.id
  const pressedCount = Object.keys(pressed).filter((k) => k !== '__bite').length

  const tap = (i) => {
    if (!myTurn || pressed[i] !== undefined) return
    const remaining = teeth - pressedCount
    const bitten = Math.random() < 1 / Math.max(1, remaining) // 매 탭 1/남은수 → 균등한 무작위 트랩
    if (bitten) {
      dbUpdate(base, { victim: me.id, [`pressed/${i}`]: me.id, [`pressed/__bite`]: i })
      if (navigator.vibrate) navigator.vibrate([80, 40, 120])
    } else {
      dbUpdate(base, { [`pressed/${i}`]: me.id, turnIdx: turnIdx + 1 })
      if (navigator.vibrate) navigator.vibrate(30)
    }
  }

  if (victim) {
    const iAmVictim = victim === me.id
    return (
      <div className="text-center py-8 clay" style={{ background: iAmVictim ? 'var(--c-coral)' : 'var(--surface)', color: iAmVictim ? '#fff' : 'var(--ink)' }}>
        <div className="text-6xl">{iAmVictim ? '💥' : '🐊'}</div>
        <p className="mt-2 font-display text-2xl">{iAmVictim ? '내가 물렸다! 벌칙 🍺' : `${order.find((p) => p.id === victim)?.nickname || '누군가'} 물림!`}</p>
        <p className="mt-1 text-sm opacity-90">진행자가 ‘새 게임’을 누르면 다시 시작해요.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-4xl">🐊</div>
      <p className="mt-1 font-display text-lg">{myTurn ? '내 차례! 이빨 하나 눌러봐 😬' : `${cur?.nickname || '?'} 님 차례…`}</p>
      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{pressedCount}/{teeth} 눌림</p>
      <div className="mt-3 grid grid-cols-5 gap-2 max-w-xs mx-auto">
        {Array.from({ length: teeth }, (_, i) => {
          const on = pressed[i] !== undefined
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={!myTurn || on}
              className="h-14 rounded-b-2xl text-2xl clay-btn disabled:opacity-50"
              style={{ background: on ? 'var(--surface-2)' : myTurn ? 'var(--c-mint)' : 'var(--surface)', color: '#fff' }}
            >
              {on ? '·' : '🦷'}
            </button>
          )
        })}
      </div>
      {!open && <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>}
    </div>
  )
}

export default {
  id: 'croc',
  name: '통아저씨',
  emoji: '🐊',
  tagline: '돌아가며 이빨 누르기 · 물리면 벌칙',
  genres: ['physical'],
  traits: ['solo'],
  controls: { reveal: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임', resetArms: true },
  HostView,
  PlayerView,
}
