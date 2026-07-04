// ① 부저 — 모드: first(선착순, 서버 타임스탬프) / mash(연타 레이싱, 팀 합산)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction, SERVER_TS, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import ModeTabs from '../components/ModeTabs'
import { Button, TeamBadge } from '../components/ui'

const MODES = [
  { id: 'first', label: '선착순', emoji: '⚡' },
  { id: 'mash', label: '연타', emoji: '🔥' },
]
const RACE_SEC = 15

/* ───────────────── 선착순 ───────────────── */
function FirstHost({ base }) {
  const raw = useValue(`${base}/buzz`)
  const order = useMemo(
    () => toList(raw).filter((b) => typeof b.ts === 'number').sort((a, b) => a.ts - b.ts),
    [raw]
  )
  const winner = order[0]
  return (
    <div className="text-center">
      {!winner ? (
        <div className="py-8 text-3xl font-display" style={{ color: 'var(--ink-soft)' }}>
          먼저 누르세요! 🔔
        </div>
      ) : (
        <div className="py-4">
          <div style={{ color: 'var(--ink-soft)' }}>가장 먼저!</div>
          <div className="font-display text-6xl mt-1 animate-pop">{winner.nickname}</div>
          <div className="mt-2">
            <TeamBadge teamId={winner.teamId} />
          </div>
          <ol className="mt-5 mx-auto max-w-xs space-y-1.5">
            {order.slice(0, 5).map((b, i) => (
              <li key={b.id} className="clay-inset flex justify-between px-4 py-2">
                <span>
                  {i + 1}. {b.nickname}
                </span>
                <span style={{ color: 'var(--ink-soft)' }}>{i === 0 ? '0ms' : `+${b.ts - winner.ts}ms`}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function FirstPlayer({ base, meta, me }) {
  const myBuzz = useValue(`${base}/buzz/${me.id}`)
  const open = meta.roundStatus === 'open'
  const pressed = !!myBuzz
  const buzz = () => {
    if (!open || pressed) return
    dbTransaction(`${base}/buzz/${me.id}`, (cur) =>
      cur ? undefined : { ts: SERVER_TS, nickname: me.nickname, teamId: me.teamId }
    )
    if (navigator.vibrate) navigator.vibrate(60)
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onPointerDown={buzz}
        disabled={!open || pressed}
        className="relative w-64 h-64 rounded-full font-display text-4xl clay-btn"
        style={{ background: pressed ? 'var(--c-mint)' : open ? 'var(--c-coral)' : 'var(--surface-2)', color: open || pressed ? '#fff' : 'var(--ink-soft)' }}
      >
        {open && !pressed && (
          <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ background: 'var(--c-coral)', opacity: 0.4 }} />
        )}
        {pressed ? '눌렀다!✅' : open ? '🔔' : '대기'}
      </button>
      <p style={{ color: 'var(--ink-soft)' }}>{pressed ? '메인 화면 확인!' : open ? '먼저 누르세요!' : '진행자 대기 중'}</p>
    </div>
  )
}

/* ───────────────── 연타 ───────────────── */
function MashHost({ base, players, teams }) {
  const running = useValue(`${base}/running`)
  const endsAt = useValue(`${base}/endsAt`)
  const tapRaw = useValue(`${base}/tap`)
  const sums = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const s = {}
    toList(tapRaw).forEach((t) => {
      const tid = byId[t.id]?.teamId
      if (tid) s[tid] = (s[tid] || 0) + (t.value || 0)
    })
    return s
  }, [tapRaw, players])
  const max = Math.max(1, ...teams.map((t) => sums[t.id] || 0))
  const timeUp = endsAt && Date.now() > endsAt
  const winner = timeUp ? [...teams].sort((a, b) => (sums[b.id] || 0) - (sums[a.id] || 0))[0] : null

  return (
    <div className="text-center">
      {!running ? (
        <Button variant="ok" onClick={() => dbUpdate(base, { running: true, endsAt: Date.now() + RACE_SEC * 1000, tap: null })}>
          🏁 레이스 시작!
        </Button>
      ) : (
        <Countdown endsAt={endsAt} />
      )}
      <div className="mt-4 space-y-3 max-w-lg mx-auto">
        {teams.map((t) => {
          const s = sums[t.id] || 0
          return (
            <div key={t.id}>
              <div className="flex justify-between font-bold text-sm" style={{ color: t.color }}>
                <span>{t.emoji} {t.name}</span>
                <span>{s} tap</span>
              </div>
              <div className="mt-1 h-9 clay-inset relative overflow-hidden">
                <div className="absolute inset-y-1 left-1 rounded-full transition-all duration-300" style={{ width: `calc(${(s / max) * 100}% - 8px)`, background: t.color, opacity: 0.85 }} />
                <div className="absolute top-0 h-full flex items-center text-2xl transition-all duration-300" style={{ left: `calc(${(s / max) * 100}% - 22px)` }}>🏎️</div>
              </div>
            </div>
          )
        })}
      </div>
      {winner && <div className="mt-4 font-display text-4xl animate-pop" style={{ color: winner.color }}>🏆 {winner.name} 승리!</div>}
    </div>
  )
}

function MashPlayer({ base, meta, me }) {
  const running = useValue(`${base}/running`)
  const endsAt = useValue(`${base}/endsAt`)
  const pending = useRef(0)
  const [local, setLocal] = useState(0)
  const active = running && endsAt && Date.now() < endsAt && meta.roundStatus !== 'reveal'
  useEffect(() => {
    const flush = () => {
      if (pending.current > 0) {
        const n = pending.current
        pending.current = 0
        dbTransaction(`${base}/tap/${me.id}`, (cur) => (cur || 0) + n)
      }
    }
    const iv = setInterval(flush, 250)
    return () => {
      flush()
      clearInterval(iv)
    }
  }, [base, me.id])
  const tap = () => {
    if (!active) return
    pending.current += 1
    setLocal((n) => n + 1)
    if (navigator.vibrate) navigator.vibrate(8)
  }
  return (
    <div className="text-center">
      {active && <Countdown endsAt={endsAt} size="text-3xl" />}
      <button
        onPointerDown={tap}
        disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn"
        style={{ background: active ? 'var(--c-coral)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--ink-soft)' }}
      >
        {active ? '🔥 연타!! 🔥' : '대기'}
        <div className="text-2xl mt-2">{local}</div>
      </button>
    </div>
  )
}

/* ───────────────── 래퍼 ───────────────── */
function HostView({ base, meta, players, teams }) {
  const mode = useValue(`${base}/mode`) || 'first'
  return (
    <div className="text-center">
      {meta.roundStatus === 'staged' && (
        <div className="mb-4">
          <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
        </div>
      )}
      {mode === 'first' ? <FirstHost base={base} /> : <MashHost base={base} players={players} teams={teams} />}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mode = useValue(`${base}/mode`) || 'first'
  return mode === 'first' ? <FirstPlayer base={base} meta={meta} me={me} /> : <MashPlayer base={base} meta={meta} me={me} />
}

export default {
  id: 'buzzer',
  name: '부저',
  emoji: '🔔',
  tagline: '선착순 · 연타',
  promptLabel: '문제/노래 힌트 (선택)',
  HostView,
  PlayerView,
}
