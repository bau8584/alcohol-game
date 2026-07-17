// 10초 맞히기 — 밀리초까지 다 보이는 스톱워치를 정확히 목표 시간에 멈추기.
// 숫자가 다 보이는데도 .00에서 못 멈춘다는 게 이 게임의 전부. 오차(ms) 절댓값으로 순위.
// 시계는 전부 로컬(performance.now)이라 네트워크 지연이 결과에 개입하지 않는다.
import { useEffect, useRef, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'

const TARGETS = [5, 10, 15]
const DEFAULT_TARGET = 10
const MEDALS = ['🥇', '🥈', '🥉']

const fmt = (ms) => (ms / 1000).toFixed(2)
const signed = (d) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}ms`

function HostView({ base, meta, players }) {
  const target = useValue(`${base}/target`) || DEFAULT_TARGET
  const raw = useValue(`${base}/res`)
  const reveal = meta.roundStatus === 'reveal'
  const idle = meta.roundStatus === 'staged'

  const results = toList(raw)
    .map((r) => ({ ...r, name: players.find((p) => p.id === r.id)?.nickname || '?', off: Math.abs(r.diff) }))
    .sort((a, b) => a.off - b.off)
  const notYet = players.filter((p) => !raw?.[p.id])
  const worst = results[results.length - 1]

  return (
    <div className="text-center">
      <div className="font-display text-xl">⏱️ 정확히 {target}.00초에 멈추기</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>숫자는 다 보입니다 · 그래도 못 멈춥니다</div>

      {idle && (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>목표 시간</div>
          <div className="flex justify-center gap-2">
            {TARGETS.map((t) => (
              <button key={t} onClick={() => dbSet(`${base}/target`, t)} className="clay-btn px-4 py-2 font-display"
                style={target === t ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {t}초
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
        {results.length}/{players.length} 완료{!reveal && ' · 공개 전'}
      </div>

      {reveal ? (
        results.length ? (
          <div className="mt-3 max-w-lg mx-auto text-left">
            <div className="mb-2 text-center font-display text-3xl animate-pop" style={{ color: 'var(--c-mint)' }}>
              🏆 {results[0].name} · {fmt(results[0].ms)}초
            </div>
            <div className="space-y-1.5">
              {results.map((r, i) => {
                const last = i === results.length - 1 && results.length > 1
                return (
                  <div key={r.id} className="clay flex items-center justify-between px-4 py-2"
                    style={last ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface)' }}>
                    <span className="font-display">
                      <span className="w-8 inline-block">{last ? '🍺' : MEDALS[i] || i + 1}</span>
                      {r.name}
                    </span>
                    <span className="font-display tabular-nums">
                      {fmt(r.ms)}초 <span className="text-sm opacity-70">{signed(r.diff)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            {worst && results.length > 1 && (
              <p className="mt-3 text-center font-display" style={{ color: 'var(--c-coral)' }}>🍺 꼴찌 {worst.name} 벌칙!</p>
            )}
            {notYet.length > 0 && (
              <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>미참여({notYet.length}): {notYet.map((p) => p.nickname).join(', ')}</p>
            )}
          </div>
        ) : (
          <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>아무도 안 했어요. 🤫</p>
        )
      ) : (
        <div className="mt-4">
          <p className="font-display text-xl" style={{ color: 'var(--ink-soft)' }}>각자 폰에서 도전 중… 🤫 ‘공개’를 누르면 순위</p>
          {notYet.length > 0 ? (
            <div className="mt-3">
              <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>아직 안 함 ({notYet.length})</div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
                {notYet.map((p) => <span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname}</span>)}
              </div>
            </div>
          ) : (
            players.length > 0 && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>전원 완료! ✅</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const target = useValue(`${base}/target`) || DEFAULT_TARGET
  const mine = useValue(`${base}/res/${me.id}`)
  const open = meta.roundStatus === 'open'
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(0)

  // 라운드가 바뀌면(base 변경) 로컬 시계 초기화
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    startRef.current = null
    setElapsed(0)
  }, [base])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const running = startRef.current !== null
  const targetMs = target * 1000

  // 가드는 ref로 — 첫 프레임 전 연타해도 재시작되지 않게
  const start = () => {
    if (!open || mine || startRef.current !== null) return
    startRef.current = performance.now()
    const loop = () => {
      setElapsed(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    if (navigator.vibrate) navigator.vibrate(20)
  }

  const stop = () => {
    if (!running) return
    const ms = Math.round(performance.now() - startRef.current)
    startRef.current = null
    cancelAnimationFrame(rafRef.current)
    setElapsed(ms)
    dbSet(`${base}/res/${me.id}`, { ms, diff: ms - targetMs })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  const shown = mine ? mine.ms : elapsed
  const done = !!mine
  const perfect = done && mine.diff === 0

  let label = '대기'
  if (perfect) label = '🎯 완벽!'
  else if (done) label = signed(mine.diff)
  else if (running) label = '✋ 멈추기!'
  else if (open) label = '▶ 시작'

  const bg = perfect ? 'var(--c-mint)' : done ? 'var(--c-grape)' : running ? 'var(--c-coral)' : open ? 'var(--c-grape)' : 'var(--surface-2)'

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>{open ? `정확히 ${target}.00초에 멈추세요` : '진행자 대기 중'}</div>
      <button onPointerDown={running ? stop : start} disabled={!open || done}
        className="mt-3 w-full h-72 rounded-3xl clay-btn transition-colors flex flex-col items-center justify-center"
        style={{ background: bg, color: open || done ? '#fff' : 'var(--ink-soft)' }}>
        <div className="font-display text-6xl tabular-nums">{fmt(shown)}</div>
        <div className="font-display text-3xl mt-3">{label}</div>
      </button>
      {done ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>기록 완료 · 한 번뿐입니다 🔒</p>
      ) : running ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--c-coral)' }}>지금이야… 지금… 🫣</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>딱 한 번의 기회 · 오차가 제일 큰 사람 벌칙 🍺</p>
      )}
    </div>
  )
}

export default {
  id: 'timing',
  name: '10초 맞히기',
  emoji: '⏱️',
  tagline: '밀리초까지 보이는데 못 멈춤',
  genres: ['physical', 'brain'],
  traits: ['solo'],
  controls: { prompt: false, startLabel: '▶ 시작', resetLabel: '🔄 새 라운드' },
  HostView,
  PlayerView,
}
