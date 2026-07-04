// ⑧ 눈치게임 — 1..N(=참가자 수)을 아무나 순서대로 '외치기'. 서버 타임스탬프로 동시 터치 자동 판정.
// 연타 방지: ① 한 번 누르면 쿨다운(버튼 잠김) ② 거의 동시에 누른 사람은 그 번호 무효 + 전원 벌칙.
//            → 혼자 조용히 누른 사람만 안전하게 번호를 얻는다. 스팸은 손해, 눈치는 이득.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbPush, SERVER_TS, toList } from '../lib/db'

// 동시 판정 창(ms): 이 시간 안에 이웃 탭이 있으면 '동시'로 보고 그 번호 무효 + 벌칙.
const LEVELS = [
  { id: 'loose', label: '느슨', ms: 120, emoji: '🍺' },
  { id: 'normal', label: '보통', ms: 220, emoji: '🙂' },
  { id: 'strict', label: '빡빡', ms: 350, emoji: '🔥' },
]
const DEFAULT_MS = 220
const COOLDOWN_MS = 2000 // 한 번 누르면 이 시간 동안 다시 못 누름(난타 차단)

// taps(서버 ts) → 안전 획득/충돌/다음 번호 결정. 모든 클라이언트가 동일 입력으로 동일 결과.
function resolve(tapsRaw, clashMs, N) {
  const taps = toList(tapsRaw)
    .filter((t) => typeof t.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
  // 이웃(앞·뒤)과 clashMs 안에 있으면 충돌
  const clashed = taps.map((t, i) => {
    const prev = taps[i - 1]
    const next = taps[i + 1]
    return (prev && t.ts - prev.ts < clashMs) || (next && next.ts - t.ts < clashMs)
  })
  let next = 1
  const assigned = [] // { ...tap, k }  안전하게 번호 획득
  const clashers = [] // 동시에 눌러 무효+벌칙
  taps.forEach((t, i) => {
    if (clashed[i]) return clashers.push(t)
    if (next <= N) assigned.push({ ...t, k: next++ })
  })
  return { assigned, clashers, next, done: next > N && N > 0 }
}

function HostView({ base, meta, players }) {
  const N = players.length
  const tapsRaw = useValue(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const { assigned, clashers, next, done } = useMemo(() => resolve(tapsRaw, clashMs, N), [tapsRaw, clashMs, N])
  const started = meta.roundStatus === 'open' || assigned.length + clashers.length > 0
  const finalHolder = done ? assigned.find((a) => a.k === N) : null
  const clashCount = clashers.length

  return (
    <div className="text-center">
      <div className="font-display text-xl">🔢 1부터 {N}까지 아무나 순서대로!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>동시에 누르면 그 번호 무효 + 전원 벌칙 · 한 번 누르면 잠깐 잠김</div>

      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>동시 판정</span>
        {LEVELS.map((lv) => (
          <button
            key={lv.id}
            onClick={() => dbSet(`${base}/clashMs`, lv.ms)}
            disabled={started}
            className="clay-btn px-3 py-1.5 text-sm font-display disabled:opacity-50"
            style={clashMs === lv.ms ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {lv.emoji} {lv.label}
          </button>
        ))}
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({(clashMs / 1000).toFixed(2)}초)</span>
      </div>

      {!done ? (
        <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>
          다음 번호 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{Math.min(next, N)}</span> / {N}
        </div>
      ) : (
        <div className="mt-3 font-display text-3xl animate-pop" style={{ color: 'var(--c-coral)' }}>💀 마지막 {N}번: {finalHolder?.by || '?'}</div>
      )}

      {/* 안전하게 획득한 번호들 */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {assigned.map((a) => (
          <span key={a.id} className="clay-inset px-3 py-1.5 font-bold animate-pop">
            {a.k}. {a.by}
          </span>
        ))}
        {!assigned.length && !clashers.length && <p className="py-6" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 외쳤어요. 🤫</p>}
      </div>

      {/* 동시 입력(무효+벌칙) */}
      {clashCount > 0 && (
        <div className="mt-4">
          <p className="font-bold" style={{ color: 'var(--c-coral)' }}>💥 동시에 눌러서 무효 · 벌칙!</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {clashers.map((c) => (
              <span key={c.id} className="clay-inset px-3 py-1.5 font-bold animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
                💥 {c.by}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const N = players.length
  const tapsRaw = useValue(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const open = meta.roundStatus === 'open'
  const { assigned, clashers, next, done } = useMemo(() => resolve(tapsRaw, clashMs, N), [tapsRaw, clashMs, N])
  const active = open && !done

  // 쿨다운(난타 차단) — 로컬 잠금 + 0.1초 틱으로 남은시간 표시
  const [lockedUntil, setLockedUntil] = useState(0)
  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 100)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { setLockedUntil(0) }, [base]) // 새 게임이면 잠금 초기화
  const cooling = nowTick < lockedUntil
  const cdLeft = Math.max(0, lockedUntil - nowTick)

  const myNums = assigned.filter((a) => a.pid === me.id).map((a) => a.k)
  const iClashed = clashers.some((c) => c.pid === me.id)

  const press = () => {
    if (!active || cooling) return
    dbPush(`${base}/taps`, { by: me.nickname, pid: me.id, ts: SERVER_TS })
    setLockedUntil(Date.now() + COOLDOWN_MS)
    if (navigator.vibrate) navigator.vibrate(40)
  }

  const label = done ? '끝!' : !open ? '대기' : cooling ? `잠깐… ${(cdLeft / 1000).toFixed(1)}s` : '🗣️ 외치기!'
  const bg = active && !cooling ? 'var(--c-grape)' : 'var(--surface-2)'

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {done ? '게임 종료' : active ? `다음 번호 ${Math.min(next, N)} / ${N}` : '진행자 대기 중'}
      </div>
      <button
        onPointerDown={press}
        disabled={!active || cooling}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn transition-colors"
        style={{ background: bg, color: active && !cooling ? '#fff' : 'var(--ink-soft)' }}
      >
        {label}
        {cooling && <div className="text-lg mt-2 opacity-90">연타 금지 · 눈치 보는 중 🫣</div>}
        {!cooling && myNums.length > 0 && <div className="text-xl mt-2 opacity-90">내 번호: {myNums.join(', ')}</div>}
      </button>

      {iClashed ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 남과 동시에 눌렀어요 — 무효 + 벌칙! 다시 노려보세요</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>혼자 조용히 눌러야 안전! 동시에 누르면 둘 다 벌칙 🫣</p>
      )}
    </div>
  )
}

export default {
  id: 'eunchi',
  name: '눈치게임',
  emoji: '🔢',
  tagline: '동시 터치 자동판정 · 연타 방지',
  genres: ['physical', 'mind'],
  traits: ['solo'],
  controls: { reveal: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임', resetArms: true },
  HostView,
  PlayerView,
}
