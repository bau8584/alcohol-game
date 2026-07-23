// 이심전심 (더 마인드 재해석) — 협동. 각자 비밀 카드 여러 장(1~5)을 '작은 수부터' 말없이 순서대로 낸다.
// 남이 더 작은 카드를 쥐고 있는데 먼저 내면 ❤️생명 하나 잃고, 그 사이의 더 작은 카드들은 공개·폐기된다.
// ⭐수리검: 카드 든 사람 전원이 동의하면 각자 '가장 작은 카드'를 공개하고 버린다(위기 탈출).
// 전원 카드를 다 내면 성공, 생명이 0이 되면 실패. 인원수 기반 난이도 프리셋 제공.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction } from '../lib/db'
import { Button } from '../components/ui'

const toArr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : [])
const sortAsc = (a) => [...a].sort((x, y) => x - y)
const remainingOf = (hands) => Object.values(hands || {}).reduce((s, h) => s + toArr(h).length, 0)

// n명에게 각 count장씩, 1~100 중 서로 다른 수를 뽑아 배정(각 손패는 오름차순)
function deal(pids, count) {
  const pool = Array.from({ length: 100 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const hands = {}
  let k = 0
  pids.forEach((pid) => { hands[pid] = sortAsc(pool.slice(k, k + count)); k += count })
  return hands
}

// 인원수 → 추천 난이도(소인원=카드 많게 스릴, 다인원=생명 넉넉히 협응 여유)
function recommend(n) {
  if (n <= 4) return { cards: 3, lives: 2, stars: 1 }
  if (n <= 7) return { cards: 2, lives: 3, stars: 1 }
  return { cards: 2, lives: 4, stars: 2 }
}
const clampCards = (c, n) => Math.max(1, Math.min(5, c, Math.floor(100 / Math.max(1, n))))

const PRESETS = [
  { key: 'easy', label: '🍺 가볍게', desc: '카드 적고 생명·수리검 넉넉', mk: () => ({ cards: 2, lives: 3, stars: 2 }) },
  { key: 'reco', label: '🎯 추천', desc: '인원수 자동 밸런스', mk: (n) => recommend(n) },
  { key: 'hard', label: '🔥 하드코어', desc: '카드 많고 생명 1개', mk: () => ({ cards: 4, lives: 1, stars: 1 }) },
]

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, players }) {
  const g = useValue(base)
  const live = players.filter((p) => p.connected !== false)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const nameOf = (pid) => byId[pid]?.nickname || '?'
  const started = !!g?.hands
  const n = live.length

  // 셋업 초안(로컬)
  const [preset, setPreset] = useState('reco')
  const [cfg, setCfg] = useState(() => recommend(2))
  // 인원수 바뀌면 '추천' 프리셋일 때 자동 재계산
  const applyPreset = (key) => { setPreset(key); setCfg(PRESETS.find((p) => p.key === key).mk(n)) }
  // 인원수가 로드/변경되면 '추천' 프리셋은 자동 재계산
  useEffect(() => { if (preset === 'reco') setCfg(recommend(n)) }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const step = (field, d, lo, hi) => setCfg((c) => ({ ...c, [field]: Math.max(lo, Math.min(hi, (c[field] || 0) + d)) }))
  const effCards = clampCards(cfg.cards, n)

  const start = () => {
    if (n < 2) return
    dbSet(base, {
      cfg: { cards: effCards, lives: cfg.lives, stars: cfg.stars },
      hands: deal(live.map((p) => p.id), effCards),
      pile: null, discards: null, starVotes: null, lastMistake: null,
      lives: cfg.lives, stars: cfg.stars, result: null,
    })
  }
  const reset = () => dbSet(base, null)

  // ── 셋업 ──
  if (!started) {
    return (
      <div className="text-center">
        <p className="font-display text-lg">🫂 이심전심</p>
        <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          말없이 <b>작은 카드부터</b> 순서대로! 전원 다 내면 협동 성공. 순서 틀리면 ❤️ 하나 잃어요.
        </p>

        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>난이도 프리셋 · 접속 {n}명</div>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className="clay-btn px-3 py-2 text-sm font-display"
                style={preset === p.key ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                title={p.desc}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Stepper label="🃏 카드" value={effCards} onDec={() => { setPreset('custom'); step('cards', -1, 1, 5) }} onInc={() => { setPreset('custom'); step('cards', 1, 1, 5) }} note={effCards < cfg.cards ? '인원수로 제한됨' : '1인당 최대 5장'} />
          <Stepper label="❤️ 생명" value={cfg.lives} onDec={() => { setPreset('custom'); step('lives', -1, 1, 5) }} onInc={() => { setPreset('custom'); step('lives', 1, 1, 5) }} />
          <Stepper label="⭐ 수리검" value={cfg.stars} onDec={() => { setPreset('custom'); step('stars', -1, 0, 3) }} onInc={() => { setPreset('custom'); step('stars', 1, 0, 3) }} />
        </div>

        <Button className="mt-5 text-xl px-8 py-3" onClick={start} disabled={n < 2}>🫂 카드 나눠주고 시작</Button>
        {n < 2 && <p className="text-sm mt-2" style={{ color: 'var(--c-coral)' }}>2명 이상 필요</p>}
      </div>
    )
  }

  const hands = g.hands || {}
  const pile = toArr(g.pile)
  const discards = toArr(g.discards)
  const holders = live.filter((p) => toArr(hands[p.id]).length)
  const remain = remainingOf(hands)

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="clay-inset px-3 py-1.5 font-display">{'❤️'.repeat(Math.max(0, g.lives))}{g.lives <= 0 ? '💀' : ''}</span>
        <span className="clay-inset px-3 py-1.5 font-display">{g.stars > 0 ? '⭐'.repeat(g.stars) : '⭐0'}</span>
        <span className="clay-inset px-3 py-1.5" style={{ color: 'var(--ink-soft)' }}>남은 카드 <b style={{ color: 'var(--ink)' }}>{remain}</b></span>
      </div>

      {g.result === 'lose' ? (
        <div className="mt-4 clay p-4 animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
          <div className="font-display text-3xl">💥 실패!</div>
          {g.lastMistake && <div className="text-sm mt-1 opacity-95"><b>{nameOf(g.lastMistake.pid)}</b>가 {g.lastMistake.num}을 성급하게 냈어요</div>}
        </div>
      ) : g.result === 'win' ? (
        <div className="mt-4 clay p-4 animate-pop" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="font-display text-3xl">🎉 전원 통과!</div>
          <div className="text-sm mt-1 opacity-95">완벽한 이심전심 · 협동 성공</div>
        </div>
      ) : (
        <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>
          말없이 작은 카드부터 순서대로 🤫
          {g.lastMistake && <div className="text-sm mt-1" style={{ color: 'var(--c-coral)' }}>직전 실수: {nameOf(g.lastMistake.pid)}가 {g.lastMistake.num} — ❤️ -1</div>}
        </div>
      )}

      {/* 낸 카드 순서 */}
      {pile.length > 0 && (
        <div className="mt-4">
          <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>낸 순서</div>
          <div className="flex flex-wrap justify-center gap-2">
            {pile.map((c, i) => (
              <span key={i} className="clay-inset px-3 py-1.5 font-bold">{c.num} · {nameOf(c.pid)}</span>
            ))}
          </div>
        </div>
      )}

      {/* 폐기된 카드(실수·수리검으로 버려짐) */}
      {discards.length > 0 && (
        <div className="mt-3">
          <div className="text-xs mb-1" style={{ color: 'var(--c-coral)' }}>버려진 카드</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {discards.map((c, i) => (
              <span key={i} className="clay-inset px-2 py-1 text-sm" style={{ color: 'var(--c-coral)' }}>{c.star ? '⭐' : '💥'}{c.num}·{nameOf(c.pid)}</span>
            ))}
          </div>
        </div>
      )}

      {/* 남은 카드 수 */}
      {!g.result && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {holders.map((p) => (
            <span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname} <b>{toArr(hands[p.id]).length}장</b></span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button variant="ghost" onClick={start}>🔄 새 판</Button>
        <Button variant="ghost" onClick={reset}>■ 종료</Button>
      </div>
    </div>
  )
}

function Stepper({ label, value, onDec, onInc, note }) {
  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <button onClick={onDec} className="clay-btn w-9 h-9 font-display text-lg">−</button>
        <span className="font-display text-2xl w-8">{value}</span>
        <button onClick={onInc} className="clay-btn w-9 h-9 font-display text-lg">+</button>
      </div>
      {note && <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{note}</div>}
    </div>
  )
}

/* ═══════════════ 참가자 ═══════════════ */
function PlayerView({ base, players, me }) {
  const g = useValue(base)
  const started = !!g?.hands
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const nameOf = (pid) => byId[pid]?.nickname || '?'

  const play = () => {
    dbTransaction(base, (cur) => {
      if (!cur || cur.result) return cur
      const hands = cur.hands || {}
      const mine = sortAsc(toArr(hands[me.id]))
      if (!mine.length) return cur
      const card = mine[0]
      let gmin = Infinity
      for (const pid in hands) { const h = toArr(hands[pid]); if (h.length) gmin = Math.min(gmin, Math.min(...h)) }
      hands[me.id] = mine.slice(1)
      const pile = toArr(cur.pile); pile.push({ pid: me.id, num: card })
      const discards = toArr(cur.discards)
      let lives = cur.lives, mistake = false
      if (card !== gmin) {
        mistake = true
        lives -= 1
        for (const pid in hands) {
          const h = toArr(hands[pid]); const keep = []
          for (const num of h) { if (num < card) discards.push({ pid, num }); else keep.push(num) }
          hands[pid] = keep
        }
      }
      cur.hands = hands; cur.pile = pile; cur.discards = discards; cur.lives = lives
      cur.lastMistake = mistake ? { pid: me.id, num: card } : (cur.lastMistake || null)
      cur.starVotes = null // 손패가 바뀌었으니 수리검 제안 초기화
      if (lives <= 0) cur.result = 'lose'
      else if (remainingOf(hands) === 0) cur.result = 'win'
      return cur
    })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  const proposeStar = () => {
    dbTransaction(base, (cur) => {
      if (!cur || cur.result || (cur.stars || 0) <= 0) return cur
      const hands = cur.hands || {}
      if (!toArr(hands[me.id]).length) return cur
      const votes = { ...(cur.starVotes || {}) }
      votes[me.id] = !votes[me.id]
      const holders = Object.keys(hands).filter((pid) => toArr(hands[pid]).length)
      const allVoted = holders.length > 0 && holders.every((pid) => votes[pid])
      if (allVoted) {
        const discards = toArr(cur.discards)
        for (const pid of holders) {
          const h = sortAsc(toArr(hands[pid])); const low = h.shift()
          hands[pid] = h; discards.push({ pid, num: low, star: true })
        }
        cur.stars = (cur.stars || 0) - 1
        cur.starVotes = null; cur.hands = hands; cur.discards = discards
        if (remainingOf(hands) === 0) cur.result = 'win'
      } else {
        cur.starVotes = votes
      }
      return cur
    })
  }

  if (!started) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🫂</div>
        <p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 카드가 나와요</p>
      </div>
    )
  }

  const hands = g.hands || {}
  const myHand = sortAsc(toArr(hands[me.id]))
  const myLowest = myHand[0]
  const done = myHand.length === 0
  const active = !g.result && !done
  const votes = g.starVotes || {}
  const holders = Object.keys(hands).filter((pid) => toArr(hands[pid]).length)
  const voteCount = holders.filter((pid) => votes[pid]).length
  const iVoted = !!votes[me.id]
  const canStar = active && (g.stars || 0) > 0

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
        <span>{'❤️'.repeat(Math.max(0, g.lives)) || '💀'}</span>
        <span>⭐{g.stars || 0}</span>
        <span>· 남은 카드 {remainingOf(hands)}</span>
      </div>

      {g.result === 'lose' ? (
        <div className="mt-4 clay p-6 animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
          <div className="text-5xl">💥</div><p className="mt-2 font-display text-2xl">실패…</p>
          {g.lastMistake && <p className="mt-1 text-sm opacity-90">{nameOf(g.lastMistake.pid)}가 {g.lastMistake.num}을 성급히 냈어요</p>}
        </div>
      ) : g.result === 'win' ? (
        <div className="mt-4 clay p-6 animate-pop" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="text-5xl">🎉</div><p className="mt-2 font-display text-2xl">전원 통과!</p>
        </div>
      ) : done ? (
        <div className="mt-4 clay p-6" style={{ background: 'var(--surface-2)' }}>
          <div className="text-5xl">✅</div><p className="mt-2 font-display text-xl">카드 다 냈어요!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>팀원이 다 낼 때까지 기다려요 🤫</p>
        </div>
      ) : (
        <>
          {/* 내 손패 */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {myHand.map((num, i) => (
              <span key={num} className="clay-inset px-3 py-2 font-display text-2xl"
                style={i === 0 ? { background: 'var(--c-grape)', color: '#fff' } : { color: 'var(--ink-soft)' }}>{num}</span>
            ))}
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>보라색이 낼 카드(내 최소값)</p>

          <button onPointerDown={play} disabled={!active}
            className="mt-3 w-full h-56 rounded-3xl font-display clay-btn flex flex-col items-center justify-center"
            style={{ background: 'var(--c-grape)', color: '#fff' }}>
            <div className="text-2xl opacity-90">내 최소 카드 내기</div>
            <div className="text-7xl">{myLowest}</div>
            <div className="text-xl mt-1">지금 낼까? 🤫</div>
          </button>
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>내 최소값이 제일 작을 것 같으면 내요 · 말·손짓 금지!</p>

          {/* 수리검 */}
          {(g.stars || 0) > 0 && (
            <button onClick={proposeStar} disabled={!canStar}
              className="mt-3 w-full clay-btn py-3 font-display"
              style={iVoted ? { background: 'var(--c-lemon)', color: 'var(--ink)' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              ⭐ 수리검 쓰자 {iVoted ? '✓' : ''} <span className="text-sm opacity-80">({voteCount}/{holders.length} 동의 · 전원 동의 시 각자 최소 카드 버림)</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default {
  id: 'themind',
  name: '이심전심',
  emoji: '🫂',
  tagline: '협동 · 여러 장을 작은 수부터 · 생명/수리검',
  genres: ['mind'],
  traits: [],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
