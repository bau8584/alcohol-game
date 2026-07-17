// 줄줄이 말해요 엔진 — 주제로 돌아가며 나열하는 스피드 게임.
// · 스톱워치(카운트업): 주제를 넘겨도 계속 흐름. 호스트가 정지/재개/리셋.
// · 판정은 호스트 화면에서: ⭕ 맞음 / ⏭ 패스 → 다음 주제로.
// · 호스트 화면에 현재 주제 + 맞은 개수 + 패스 개수 표시.
// createRelayGame(config)로 모듈 생성. config = { id, name, emoji, tagline, genres, traits, guide, subsets }
// subsets = [{ key, label, cards: [{ text }] }]
import { useEffect, useState } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// sw = { accum, startedAt } → 경과 ms
const elapsedOf = (sw) => (sw?.accum || 0) + (sw?.startedAt ? Date.now() - sw.startedAt : 0)
const fmt = (ms) => {
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}초`
  const m = Math.floor(s / 60)
  const r = (s - m * 60).toFixed(0).padStart(2, '0')
  return `${m}:${r}`
}

// 카운트업 스톱워치 표시
function Stopwatch({ sw, size = 'text-6xl' }) {
  const [, tick] = useState(0)
  const running = !!sw?.startedAt
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => tick((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [running])
  return (
    <div className={`font-display tabular-nums ${size}`} style={{ color: running ? 'var(--c-mint)' : 'var(--ink-soft)' }}>
      {fmt(elapsedOf(sw))}
      {!running && <span className="text-2xl ml-2 opacity-70">⏸</span>}
    </div>
  )
}

export function createRelayGame(config) {
  const { subsets, guide } = config
  const subsetByKey = (k) => subsets.find((s) => s.key === k) || null

  /* ───────── 호스트 ───────── */
  function HostView({ base, meta }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const results = useValue(`${base}/results`)
    const sw = useValue(`${base}/sw`)

    // 세트 선택
    if (!subset) {
      return (
        <div className="text-center">
          <p className="font-display text-xl mb-4">{config.emoji} 어떤 주제 세트로 할까요?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
            {subsets.filter((s) => meta?.adultEnabled || !s.adult).map((s) => (
              <button
                key={s.key}
                onClick={() => dbSet(base, { subset: s.key, order: shuffle(s.cards.length), idx: 0, results: null, sw: { accum: 0, startedAt: Date.now() } })}
                className="clay-btn py-4 font-display text-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
              >
                {s.label}
                <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{s.cards.length}개</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    const deck = subsetByKey(subset)
    const cards = deck?.cards || []
    const total = order?.length || 0
    const okN = Object.values(results || {}).filter((v) => v === 'ok').length
    const passN = Object.values(results || {}).filter((v) => v === 'pass').length
    const running = !!sw?.startedAt

    const toggleSw = () =>
      running
        ? dbSet(`${base}/sw`, { accum: elapsedOf(sw), startedAt: null })
        : dbSet(`${base}/sw`, { accum: sw?.accum || 0, startedAt: Date.now() })
    const resetSw = () => dbSet(`${base}/sw`, { accum: 0, startedAt: running ? Date.now() : null })
    const mark = (kind) => dbUpdate(base, { [`results/${idx}`]: kind, idx: idx + 1 })
    const back = () => idx > 0 && dbUpdate(base, { idx: idx - 1 })
    const restart = () => dbSet(base, { subset, order: shuffle(cards.length), idx: 0, results: null, sw: { accum: 0, startedAt: Date.now() } })

    const done = idx >= total

    return (
      <div className="text-center">
        <div className="flex items-center justify-between mb-3">
          <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {Math.min(idx + 1, total)}/{total}</span>
          <button onClick={() => dbSet(base, null)} className="text-sm clay-btn px-3 py-1" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>🔄 다른 세트</button>
        </div>

        {/* 스톱워치 */}
        <div className="clay-inset py-3">
          <Stopwatch sw={sw} />
          <div className="flex justify-center gap-2 mt-2">
            <Button variant={running ? 'warn' : 'ok'} className="!py-2 !text-base" onClick={toggleSw}>{running ? '⏸ 정지' : '▶ 시작'}</Button>
            <Button variant="ghost" className="!py-2 !text-base" onClick={resetSw}>🔄 타이머 리셋</Button>
          </div>
        </div>

        {/* 집계 */}
        <div className="flex justify-center gap-3 mt-3">
          <span className="clay-inset px-4 py-1.5 font-display text-xl" style={{ color: 'var(--c-mint)' }}>⭕ {okN}</span>
          <span className="clay-inset px-4 py-1.5 font-display text-xl" style={{ color: 'var(--c-coral)' }}>⏭ {passN}</span>
        </div>

        {/* 현재 주제 / 판정 */}
        {done ? (
          <div className="mt-5 py-4">
            <div className="text-5xl">🏁</div>
            <p className="mt-2 font-display text-2xl">세트 종료!</p>
            <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>최종 기록 <b style={{ color: 'var(--ink)' }}>{fmt(elapsedOf(sw))}</b> · 맞음 {okN} · 패스 {passN}</p>
            <Button className="mt-4" onClick={restart}>🔁 다시 하기</Button>
          </div>
        ) : (
          <>
            <div className="clay-inset mt-4 py-8 px-4 min-h-[120px] flex items-center justify-center">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>현재 주제</div>
                <div className="font-display text-4xl leading-tight">{cards[order?.[idx]]?.text}</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Button variant="ghost" onClick={back} disabled={idx === 0}>◀ 이전</Button>
              <Button variant="ok" onClick={() => mark('ok')}>⭕ 맞음</Button>
              <Button variant="danger" onClick={() => mark('pass')}>⏭ 패스</Button>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ───────── 플레이어 (주제·시간만 보고 외침) ───────── */
  function PlayerView({ base }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const sw = useValue(`${base}/sw`)

    if (!subset) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl">{config.emoji}</div>
          <p className="mt-3 font-display text-xl">호스트가 주제를 고르는 중…</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
        </div>
      )
    }
    const deck = subsetByKey(subset)
    const cards = deck?.cards || []
    const total = order?.length || 0
    const cur = idx < total ? cards[order?.[idx]]?.text : null

    return (
      <div className="text-center">
        <Stopwatch sw={sw} size="text-4xl" />
        {cur ? (
          <div className="clay p-6 mt-3" style={{ background: 'var(--c-grape)', color: '#fff' }}>
            <div className="opacity-80 text-sm">현재 주제 · 돌아가며 외쳐요! 📣</div>
            <div className="font-display text-3xl mt-2 leading-tight">{cur}</div>
          </div>
        ) : (
          <p className="mt-4 font-display text-xl">🏁 세트 종료!</p>
        )}
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{guide || '막히면 벌칙! 🍺'}</p>
      </div>
    )
  }

  return {
    id: config.id,
    name: config.name,
    emoji: config.emoji,
    tagline: config.tagline,
    genres: config.genres,
    traits: config.traits,
    controls: { mode: 'self' },
    HostView,
    PlayerView,
  }
}
