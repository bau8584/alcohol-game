// 초록불 반응 — 🔴 대기하다가 랜덤 시점에 🟢로 바뀌면 최대한 빨리 탭. 반응시간이 곧 순위.
// 단, 초록 전에 누르면 '부정출발' 아웃(자제력 시험). 딩동과 달리 '참는' 재미가 핵심.
// 반응시간 = 탭serverNow − 초록serverNow (로컬 측정) → 기기 시계 차이와 무관.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList, serverNow } from '../lib/db'
import { Button } from '../components/ui'

const MIN_WAIT = 2000
const MAX_EXTRA = 4000 // 초록까지 2~6초 랜덤

function useNow(on) {
  const [now, setNow] = useState(serverNow())
  useEffect(() => {
    if (!on) return
    let raf = 0
    const loop = () => { setNow(serverNow()); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return now
}

function useBoard(base, players) {
  const raw = useValue(`${base}/taps`)
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const taps = toList(raw).map((t) => ({ pid: t.id, ms: t.ms, name: byId[t.id]?.nickname || '?' })).filter((t) => byId[t.pid])
    const valid = taps.filter((t) => t.ms >= 0).sort((a, b) => a.ms - b.ms)
    const falseStarts = taps.filter((t) => t.ms < 0)
    return { valid, falseStarts, tapped: taps.length }
  }, [raw, players])
}

function HostView({ base, players }) {
  const startedAt = useValue(`${base}/startedAt`)
  const greenAt = useValue(`${base}/greenAt`)
  const running = !!startedAt
  const now = useNow(running)
  const green = greenAt && now >= greenAt
  const { valid, falseStarts, tapped } = useBoard(base, players)
  const live = players.filter((p) => p.connected !== false).length

  const start = () => {
    const t = serverNow()
    dbUpdate(base, { startedAt: t, greenAt: t + MIN_WAIT + Math.floor(Math.random() * MAX_EXTRA), taps: null })
  }
  const reset = () => dbUpdate(base, { startedAt: null, greenAt: null, taps: null })

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ok" onClick={start}>{running ? '🔄 다시' : '🚦 시작'}</Button>
        {running && <Button variant="ghost" onClick={reset}>■ 정지</Button>}
      </div>

      {!running ? (
        <p className="mt-5 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>🟢 초록에 최대한 빨리! 🔴 빨강에 누르면 아웃 🍺</p>
      ) : (
        <>
          <div className="mt-4 rounded-3xl py-12 font-display text-5xl transition-colors"
            style={{ background: green ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
            {green ? '🟢 지금!' : '🔴 대기…'}
          </div>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>누른 사람 {tapped}/{live}</div>
        </>
      )}

      {(valid.length > 0 || falseStarts.length > 0) && (
        <div className="mt-4 max-w-md mx-auto text-left space-y-1.5">
          {valid.map((t, i) => (
            <div key={t.pid} className="clay-inset px-3 py-2 flex items-center justify-between" style={i === 0 ? { background: 'var(--c-mint)', color: '#fff' } : {}}>
              <span className="font-display">{['🥇', '🥈', '🥉'][i] || i + 1}. {t.name}</span>
              <span className="font-display tabular-nums">{t.ms}ms</span>
            </div>
          ))}
          {falseStarts.map((t) => (
            <div key={t.pid} className="clay-inset px-3 py-2 flex items-center justify-between" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <span className="font-display">🚫 {t.name}</span>
              <span className="text-sm opacity-90">부정출발 · 벌칙</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const startedAt = useValue(`${base}/startedAt`)
  const greenAt = useValue(`${base}/greenAt`)
  const mine = useValue(`${base}/taps/${me.id}`)
  const running = !!startedAt
  const now = useNow(running && mine == null)
  const green = greenAt && now >= greenAt
  const done = mine != null

  const tap = () => {
    if (!running || done) return
    dbSet(`${base}/taps/${me.id}`, { ms: serverNow() - greenAt })
    if (navigator.vibrate) navigator.vibrate(30)
  }

  let label = '대기'
  let bg = 'var(--surface-2)'
  let fg = 'var(--ink-soft)'
  if (done && mine.ms < 0) { label = '🚫 부정출발!'; bg = 'var(--c-coral)'; fg = '#fff' }
  else if (done) { label = `${mine.ms}ms`; bg = 'var(--c-mint)'; fg = '#fff' }
  else if (green) { label = '🟢 지금!'; bg = 'var(--c-mint)'; fg = '#fff' }
  else if (running) { label = '🔴 참아…'; bg = 'var(--c-coral)'; fg = '#fff' }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {!running ? '진행자 대기 중' : done ? '결과' : green ? '지금 눌러!' : '초록 되면 눌러 · 지금 누르면 아웃'}
      </div>
      <button onPointerDown={tap} disabled={!running || done}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn transition-colors"
        style={{ background: bg, color: fg }}>
        {label}
      </button>
      {done && mine.ms < 0 ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>초록 전에 눌렀어요! 부정출발 · 벌칙 🍺</p>
      ) : done ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-mint)' }}>반응 {mine.ms}ms · 빠를수록 상위!</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>🔴일 때 참고, 🟢 되는 순간 탭! 🫣</p>
      )}
    </div>
  )
}

export default {
  id: 'greenlight',
  name: '초록불 반응',
  emoji: '🚦',
  tagline: '초록에 최대한 빨리 · 빨강에 누르면 아웃',
  genres: ['physical', 'brain'],
  traits: ['solo'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
