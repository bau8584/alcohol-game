// 10. 밀리초 데시벨 — 팀별 연타 합산 레이싱.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbUpdate, dbTransaction, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import { Button } from '../components/ui'

const RACE_SEC = 15

function teamSums(tapRaw, players) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const sums = {}
  toList(tapRaw).forEach((t) => {
    const teamId = byId[t.id]?.teamId
    if (teamId) sums[teamId] = (sums[teamId] || 0) + (t.value || 0)
  })
  return sums
}

function HostView({ base, players, teams }) {
  const running = useValue(`${base}/running`)
  const endsAt = useValue(`${base}/endsAt`)
  const tapRaw = useValue(`${base}/tap`)
  const sums = useMemo(() => teamSums(tapRaw, players), [tapRaw, players])
  const max = Math.max(1, ...teams.map((t) => sums[t.id] || 0))
  const timeUp = endsAt && Date.now() > endsAt
  const winner = timeUp ? [...teams].sort((a, b) => (sums[b.id] || 0) - (sums[a.id] || 0))[0] : null

  const start = () => dbUpdate(base, { running: true, endsAt: Date.now() + RACE_SEC * 1000, tap: null })

  return (
    <div className="text-center">
      {!running ? (
        <Button variant="ok" className="text-xl px-8 py-4" onClick={start}>
          🏁 레이스 시작!
        </Button>
      ) : (
        <Countdown endsAt={endsAt} />
      )}
      <div className="mt-5 space-y-4 max-w-3xl mx-auto">
        {teams.map((t) => {
          const s = sums[t.id] || 0
          return (
            <div key={t.id}>
              <div className="flex justify-between text-sm font-bold" style={{ color: t.color }}>
                <span>
                  {t.emoji} {t.name}
                </span>
                <span className="tabular-nums">{s} tap</span>
              </div>
              <div className="mt-1 h-10 rounded-full bg-white/5 relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(s / max) * 100}%`, background: t.color + '33' }}
                />
                <div
                  className="absolute top-0 h-full flex items-center text-2xl transition-all duration-300"
                  style={{ left: `calc(${(s / max) * 100}% - 28px)` }}
                >
                  🏎️
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {winner && (
        <div className="mt-5 text-4xl font-black animate-pop" style={{ color: winner.color }}>
          🏆 {winner.emoji} {winner.name} 승리!
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const running = useValue(`${base}/running`)
  const endsAt = useValue(`${base}/endsAt`)
  const pending = useRef(0)
  const [local, setLocal] = useState(0)
  const active = running && endsAt && Date.now() < endsAt && meta.roundStatus !== 'reveal'

  // 로컬 누적분을 250ms 간격으로 서버에 합산 반영 (쓰기 폭주 방지)
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
    <div className="text-center select-none">
      {active ? <Countdown endsAt={endsAt} size="text-3xl" /> : null}
      <button
        onPointerDown={tap}
        disabled={!active}
        className={`mt-3 w-full h-72 rounded-3xl text-4xl font-black active:scale-95 transition ${
          active ? 'bg-gradient-to-b from-amber-400 to-rose-500 text-black' : 'bg-white/10 text-white/40'
        }`}
      >
        {active ? '🔥 연타!!! 🔥' : '대기중'}
        <div className="text-2xl mt-2 tabular-nums">{local}</div>
      </button>
      <p className="mt-2 text-white/50 text-sm">화면을 미친 듯이 두드리세요!</p>
    </div>
  )
}

export default {
  id: 'tap',
  name: '밀리초 데시벨',
  emoji: '🏎️',
  tagline: '팀별 연타 합산 레이싱',
  promptLabel: '레이스 설명 (선택)',
  HostView,
  PlayerView,
}
