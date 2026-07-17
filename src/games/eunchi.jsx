// 눈치게임 — 1..N을 아무나 순서대로. 딱 한 번만 터치(누르면 영구 잠금).
// 서버 타임스탬프로 '거의 동시에 누른 사람끼리' 묶어서 걸림(무효+벌칙) → 누가 누구랑 걸렸는지 표시.
// 혼자 간격 두고 누른 사람만 안전하게 번호 획득.
import { useMemo } from 'react'
import { useValue, useChildList, dbPush, dbSet, SERVER_TS } from '../lib/db'

const LEVELS = [
  { id: 'loose', label: '느슨', ms: 120, emoji: '🍺' },
  { id: 'normal', label: '보통', ms: 250, emoji: '🙂' },
  { id: 'strict', label: '빡빡', ms: 400, emoji: '🔥' },
]
const DEFAULT_MS = 250

// taps(서버 ts) → 클러스터링. 연속 탭 간격이 clashMs 이하면 같은 '동시 그룹'.
// 그룹 크기 1 = 안전(번호 획득), 2+ = 다 같이 걸림. 한 사람은 첫 탭만.
function resolve(tapsList, clashMs, N) {
  const seen = new Set()
  const taps = tapsList
    .filter((t) => typeof t.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
    .filter((t) => (seen.has(t.pid) ? false : (seen.add(t.pid), true)))
  const clusters = []
  let cur = []
  let prev = null
  for (const t of taps) {
    if (prev !== null && t.ts - prev > clashMs) { clusters.push(cur); cur = [] }
    cur.push(t)
    prev = t.ts
  }
  if (cur.length) clusters.push(cur)

  const assigned = []
  const clashGroups = []
  let next = 1
  for (const cl of clusters) {
    if (cl.length === 1) assigned.push({ ...cl[0], k: next++ })
    else clashGroups.push(cl)
  }
  const pressed = seen.size
  return { assigned, clashGroups, next, pressed, done: N > 0 && pressed >= N }
}

// pid → 닉네임 (리스트 항목엔 pid만 저장하고 이름은 여기서 붙임)
function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

function HostView({ base, meta, players }) {
  const N = players.filter((p) => p.connected !== false).length
  const tapsList = useChildList(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const nameOf = useNameOf(players)
  const { assigned, clashGroups, next, pressed, done } = useMemo(() => resolve(tapsList, clashMs, N), [tapsList, clashMs, N])
  const started = meta.roundStatus === 'open' || pressed > 0

  return (
    <div className="text-center">
      <div className="font-display text-xl">🔢 1부터 {N}까지 아무나 순서대로!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>딱 한 번만 터치 · 동시에 누른 사람끼리 걸림 💥</div>

      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>동시 판정</span>
        {LEVELS.map((lv) => (
          <button key={lv.id} onClick={() => dbSet(`${base}/clashMs`, lv.ms)} disabled={started}
            className="clay-btn px-3 py-1.5 text-sm font-display disabled:opacity-50"
            style={clashMs === lv.ms ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            {lv.emoji} {lv.label}
          </button>
        ))}
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({(clashMs / 1000).toFixed(2)}초)</span>
      </div>

      <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>
        {done ? '게임 종료' : <>다음 번호 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{Math.min(next, N)}</span> / {N} · 누른 사람 {pressed}/{N}</>}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {assigned.map((a) => (
          <span key={a.id} className="clay-inset px-3 py-1.5 font-bold animate-pop">{a.k}. {nameOf(a.pid)}</span>
        ))}
        {!assigned.length && !clashGroups.length && <p className="py-6" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 외쳤어요. 🤫</p>}
      </div>

      {clashGroups.length > 0 && (
        <div className="mt-4">
          <p className="font-bold" style={{ color: 'var(--c-coral)' }}>💥 동시에 눌러서 걸린 사람들 · 벌칙!</p>
          <div className="mt-2 space-y-1.5 max-w-md mx-auto">
            {clashGroups.map((g, i) => (
              <div key={i} className="clay-inset px-3 py-2 font-display animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
                💥 {g.map((t) => nameOf(t.pid)).join('  ↔  ')} <span className="text-sm opacity-90">({g.length}명 동시)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const N = players.filter((p) => p.connected !== false).length
  const tapsList = useChildList(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const nameOf = useNameOf(players)
  const open = meta.roundStatus === 'open'
  const { assigned, clashGroups, next, done } = useMemo(() => resolve(tapsList, clashMs, N), [tapsList, clashMs, N])

  const hasPressed = useMemo(() => tapsList.some((t) => t.pid === me.id), [tapsList, me.id])
  const active = open && !done && !hasPressed
  const myNum = assigned.find((a) => a.pid === me.id)?.k
  const myClash = clashGroups.find((g) => g.some((t) => t.pid === me.id))

  const press = () => {
    if (!active) return
    dbPush(`${base}/taps`, { pid: me.id, ts: SERVER_TS })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  let label = '대기'
  if (done) label = '끝!'
  else if (active) label = '🗣️ 외치기!'
  else if (hasPressed && myClash) label = '💥 걸렸다!'
  else if (hasPressed && myNum) label = `내 번호 ${myNum} · 안전 ✅`
  else if (hasPressed) label = '눌렀다! 결과 대기…'
  const bg = active ? 'var(--c-grape)' : myClash ? 'var(--c-coral)' : myNum ? 'var(--c-mint)' : 'var(--surface-2)'
  const fg = active || myClash || myNum ? '#fff' : 'var(--ink-soft)'

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {done ? '게임 종료' : open ? `다음 번호 ${Math.min(next, N)} / ${N}` : '진행자 대기 중'}
      </div>
      <button onPointerDown={press} disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn transition-colors"
        style={{ background: bg, color: fg }}>
        {label}
      </button>
      {myClash ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 {myClash.filter((t) => t.pid !== me.id).map((t) => nameOf(t.pid)).join(', ') || '누군가'} 랑 동시에 눌러서 걸렸어요! 벌칙 🍺</p>
      ) : hasPressed ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>한 번 눌렀어요 · 더는 못 눌러요 🔒</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>앞사람과 간격 두고 딱 한 번! 붙여 누르면 걸림 🫣</p>
      )}
    </div>
  )
}

export default {
  id: 'eunchi',
  name: '눈치게임',
  emoji: '🔢',
  tagline: '한 번 터치 · 동시 걸림 판정',
  genres: ['physical', 'mind'],
  traits: ['solo'],
  controls: { reveal: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임', resetArms: true },
  HostView,
  PlayerView,
}
