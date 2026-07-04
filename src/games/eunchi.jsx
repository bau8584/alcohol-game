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

// taps(서버 ts) → 안전 획득/무효/다음 번호 결정. 모든 클라이언트가 동일 입력→동일 결과(결정적).
// 규칙: ① 한 사람은 번호 하나만(획득 후 추가 탭 무시).
//       ② 직전에 '안전하게' 번호를 받은 사람과 clashMs 이내로 붙여 누르면 그 (늦은) 사람만 무효+벌칙.
//          → 먼저 받은 번호는 소급 취소되지 않음. 간격 두고 혼자 누른 사람이 안전.
function resolve(tapsRaw, clashMs, N) {
  const taps = toList(tapsRaw)
    .filter((t) => typeof t.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
  const assigned = [] // { ...tap, k }  안전하게 번호 획득
  const assignedPids = new Set() // 이미 번호를 받은 사람
  const voidByPid = new Map() // pid → 대표 무효 탭 (아직 번호 못 받고 벌칙)
  let lastSafeTs = null
  let next = 1
  for (const t of taps) {
    if (assignedPids.has(t.pid)) continue // 이미 번호 획득 → 추가 탭 무시(독식 방지)
    if (lastSafeTs !== null && t.ts - lastSafeTs < clashMs) {
      voidByPid.set(t.pid, t) // 직전 안전 탭과 너무 붙음 → 무효 + 벌칙
      continue
    }
    if (next <= N) {
      assigned.push({ ...t, k: next++ })
      assignedPids.add(t.pid)
      voidByPid.delete(t.pid) // 앞서 무효였어도 이제 획득했으면 벌칙 해제
      lastSafeTs = t.ts
    }
  }
  const clashers = [...voidByPid.values()].filter((t) => !assignedPids.has(t.pid))
  return { assigned, clashers, next, done: next > N && N > 0 }
}

function HostView({ base, meta, players }) {
  const N = players.filter((p) => p.connected !== false).length // 접속자만 목표 인원
  const tapsRaw = useValue(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const { assigned, clashers, next, done } = useMemo(() => resolve(tapsRaw, clashMs, N), [tapsRaw, clashMs, N])
  const started = meta.roundStatus === 'open' || assigned.length + clashers.length > 0
  const finalHolder = done ? assigned.find((a) => a.k === N) : null
  const clashCount = clashers.length

  return (
    <div className="text-center">
      <div className="font-display text-xl">🔢 1부터 {N}까지 아무나 순서대로!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>직전 사람과 너무 붙여 누르면 그 사람 무효 + 벌칙 · 한 번 누르면 잠깐 잠김</div>

      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>최소 간격</span>
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

      {/* 너무 붙여 누름(무효+벌칙) */}
      {clashCount > 0 && (
        <div className="mt-4">
          <p className="font-bold" style={{ color: 'var(--c-coral)' }}>💥 너무 붙여 눌러서 무효 · 벌칙!</p>
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
  const N = players.filter((p) => p.connected !== false).length // 접속자만 목표 인원
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
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 직전 사람과 너무 붙여 눌렀어요 — 무효 + 벌칙! 간격 두고 다시</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>앞사람과 간격을 두고 눌러야 안전! 붙여 누르면 벌칙 🫣</p>
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
