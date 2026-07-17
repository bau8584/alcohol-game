// 동시 입력 배틀 엔진 — 주제 하나로 전원이 '동시에' 폰에 나열하는 스피드 게임.
// 기존 '돌아가며 한 명씩 외치기'와 달리 32명이 한꺼번에 참여하고, 호스트는 ⭕/⏭ 판정을 하지 않는다.
//
// 채점은 자동(스캐터고리 방식): 라운드가 끝나면 답을 정규화해서
//   · 남과 겹친 답 → 0점 (누구나 떠올리는 답은 의미 없음)
//   · 나만 쓴 답   → +1점
// 이라 "많이"가 아니라 "남들이 생각 못 한 걸" 써야 이긴다.
//
// createScatterGame(config) → 게임 모듈
// config = { id, name, emoji, tagline, genres, traits, subsets }
// subsets = [{ key, label, cards: [{ text }], adult? }]
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, dbTransaction } from '../lib/db'
import { addTeamScore } from '../lib/actions'
import { norm, tally } from './scatterScore'
import Countdown from '../components/Countdown'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const SECS = [20, 30, 45, 60]
const DEFAULT_SEC = 30
const MODES = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
]
const MEDALS = ['🥇', '🥈', '🥉']

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 라운드 상태를 endsAt + 로컬 시계로 판정 (대기 / 입력중 / 결과)
function useRound(endsAt) {
  const [now, setNow] = useState(() => Date.now())
  const live = !!endsAt && now < endsAt
  useEffect(() => {
    if (!endsAt) return
    const iv = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(iv)
  }, [endsAt])
  return { idle: !endsAt, live, done: !!endsAt && now >= endsAt }
}

export function createScatterGame(config) {
  const { subsets } = config
  const subsetByKey = (k) => subsets.find((s) => s.key === k) || null

  /* ───────── 호스트 ───────── */
  function HostView({ roomId, base, meta, players, teams }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const endsAt = useValue(`${base}/endsAt`)
    const ansRaw = useValue(`${base}/ans`)
    const scored = useValue(`${base}/scored`)
    const mode = useValue(`${base}/mode`) || 'team'
    const sec = useValue(`${base}/sec`) || DEFAULT_SEC

    const { idle, live, done } = useRound(endsAt)
    const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
    const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
    const res = useMemo(() => tally(ansRaw), [ansRaw])

    // 개인 순위 (유니크 많은 순)
    const ranked = useMemo(
      () =>
        Object.entries(res)
          .map(([pid, r]) => ({ pid, ...r, p: byId[pid] }))
          .filter((r) => r.p)
          .sort((a, b) => b.uniq - a.uniq || b.items.length - a.items.length),
      [res, byId]
    )
    // 팀 합계
    const teamScores = useMemo(() => {
      const s = {}
      teams.forEach((t) => (s[t.id] = 0))
      ranked.forEach((r) => {
        if (r.p.teamId && s[r.p.teamId] !== undefined) s[r.p.teamId] += r.uniq
      })
      return s
    }, [ranked, teams])

    const deck = subsetByKey(subset)
    const total = order?.length || 0
    const topic = deck?.cards?.[order?.[idx]]?.text
    const atEnd = idx >= total - 1
    const typing = Object.keys(ansRaw || {}).length

    const newTopic = (i) => dbUpdate(base, { idx: i, endsAt: null, ans: null, scored: null })
    const go = (d) => newTopic(Math.min(total - 1, Math.max(0, idx + d)))
    const start = () => dbUpdate(base, { endsAt: Date.now() + sec * 1000, ans: null, scored: null })
    const applyScore = async () => {
      const r = await dbTransaction(`${base}/scored`, (cur) => (cur ? undefined : true))
      if (!r.committed) return
      teams.forEach((t) => teamScores[t.id] > 0 && addTeamScore(roomId, t.id, teamScores[t.id]))
    }

    // 세트 선택 전
    if (!subset) {
      return (
        <div className="text-center">
          <p className="font-display text-xl mb-4">{config.emoji} 어떤 주제 세트로 할까요?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {subsets.filter((s) => meta?.adultEnabled || !s.adult).map((s) => (
              <button
                key={s.key}
                onClick={() => dbSet(base, { subset: s.key, order: shuffle(s.cards.length), idx: 0, endsAt: null, ans: null, scored: null, mode, sec })}
                className="clay-btn py-5 font-display text-lg"
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

    return (
      <div className="text-center">
        <div className="flex items-center justify-between mb-3">
          <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {idx + 1}/{total}</span>
          <button onClick={() => dbSet(base, null)} className="text-sm clay-btn px-3 py-1" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>🔄 다른 세트</button>
        </div>

        {/* 대기 중에만 모드·시간 설정 */}
        {idle && (
          <div className="mb-3 flex flex-col items-center gap-2">
            <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>제한시간</span>
              {SECS.map((s) => (
                <button key={s} onClick={() => dbSet(`${base}/sec`, s)} className="clay-btn px-3 py-1.5 text-sm font-display"
                  style={sec === s ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                  {s}초
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 주제 */}
        <div className="clay-inset py-8 px-4 min-h-[140px] flex flex-col items-center justify-center">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>주제</div>
          <div className="font-display text-4xl leading-tight">{topic || '—'}</div>
          {live && <div className="mt-3"><Countdown endsAt={endsAt} size="text-5xl" /></div>}
          {live && <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>✍️ {typing}명 입력 중… (내용은 끝나면 공개)</div>}
          {idle && <div className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>시작을 누르면 전원이 동시에 폰으로 입력해요</div>}
        </div>

        {/* 컨트롤 — 판정 버튼 없음 */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Button variant="ghost" onClick={() => go(-1)} disabled={idx === 0 || live}>◀ 이전</Button>
          {!live && <Button variant="ok" onClick={start}>{done ? '🔄 다시 (같은 주제)' : `⏱ ${sec}초 시작`}</Button>}
          {atEnd ? (
            <Button variant="primary" onClick={() => dbUpdate(base, { order: shuffle(total), idx: 0, endsAt: null, ans: null, scored: null })} disabled={live}>🔀 다시 섞기</Button>
          ) : (
            <Button variant="primary" onClick={() => go(1)} disabled={live}>다음 주제 ▶</Button>
          )}
        </div>

        {/* 결과 */}
        {done && (
          <div className="mt-5">
            {mode === 'team' ? (
              <div className="grid gap-2 max-w-lg mx-auto">
                {[...teams].sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0)).map((t, i) => (
                  <div key={t.id} className="clay-inset px-3 py-2 flex items-center justify-between">
                    <span className="font-bold" style={{ color: t.color }}>{MEDALS[i] || ''} {t.name}</span>
                    <span className="font-display text-2xl">{teamScores[t.id] || 0}<span className="text-sm opacity-60">점</span></span>
                  </div>
                ))}
                <Button variant="ok" onClick={applyScore} disabled={!!scored}>
                  {scored ? '✅ 팀 점수에 반영됨' : '🏆 팀 점수에 반영'}
                </Button>
              </div>
            ) : (
              <div className="max-w-lg mx-auto text-left space-y-1.5">
                {ranked.slice(0, 8).map((r, i) => (
                  <div key={r.pid} className="clay-inset px-3 py-2 flex items-center gap-2">
                    <span className="font-display w-8 shrink-0 text-center">{MEDALS[i] || i + 1}</span>
                    <span className="font-bold shrink-0">{r.p.nickname}</span>
                    <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--ink-soft)' }}>
                      {r.items.map((it) => it.text).join(', ')}
                    </span>
                    <span className="font-display shrink-0" style={{ color: 'var(--c-mint)' }}>{r.uniq}점</span>
                  </div>
                ))}
                {!ranked.length && <p className="text-sm py-2 text-center" style={{ color: 'var(--ink-soft)' }}>아무도 입력하지 않았어요.</p>}
              </div>
            )}

            {/* 겹친 답 — 이 게임의 핵심 재미 */}
            <Overlaps res={res} byId={byId} />
          </div>
        )}
      </div>
    )
  }

  // 여러 명이 똑같이 쓴 답 = 0점. 누가 겹쳤는지 보여준다.
  function Overlaps({ res, byId }) {
    const groups = useMemo(() => {
      const m = {}
      Object.entries(res).forEach(([pid, r]) =>
        r.items.forEach((it) => {
          if (it.uniq) return
          if (!m[it.n]) m[it.n] = { text: it.text, pids: [] }
          m[it.n].pids.push(pid)
        })
      )
      return Object.values(m).sort((a, b) => b.pids.length - a.pids.length)
    }, [res])
    if (!groups.length) return null
    return (
      <div className="mt-4 max-w-lg mx-auto">
        <div className="text-sm mb-1" style={{ color: 'var(--c-coral)' }}>💥 겹쳐서 0점 처리된 답</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {groups.slice(0, 12).map((g, i) => (
            <span key={i} className="clay-inset px-2.5 py-1 text-sm">
              <b>{g.text}</b>{' '}
              <span style={{ color: 'var(--ink-soft)' }}>×{g.pids.length} ({g.pids.map((p) => byId[p]?.nickname || '?').join(', ')})</span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  /* ───────── 플레이어 ───────── */
  function PlayerView({ base, me }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const endsAt = useValue(`${base}/endsAt`)
    const mineRaw = useValue(`${base}/ans/${me.id}`)
    const ansRaw = useValue(`${base}/ans`)
    const [text, setText] = useState('')

    const { idle, live, done } = useRound(endsAt)
    useEffect(() => { setText('') }, [idx, endsAt])

    const mine = useMemo(() => Object.values(mineRaw || {}).map((v) => v?.t).filter(Boolean), [mineRaw])
    const res = useMemo(() => (done ? tally(ansRaw) : null), [done, ansRaw])
    const myRes = res?.[me.id]

    if (!subset) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl">{config.emoji}</div>
          <p className="mt-3 font-display text-xl">호스트가 주제를 고르는 중…</p>
        </div>
      )
    }

    const deck = subsetByKey(subset)
    const topic = deck?.cards?.[order?.[idx]]?.text
    const add = () => {
      const t = text.trim()
      if (!t || !live) return
      // 이미 쓴 답이면 무시 (어차피 집계에서 1개로 셈)
      if (mine.some((m) => norm(m) === norm(t))) { setText(''); return }
      dbPush(`${base}/ans/${me.id}`, { t })
      setText('')
      if (navigator.vibrate) navigator.vibrate(8)
    }

    return (
      <div className="text-center">
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제</div>
        <div className="font-display text-2xl leading-tight">{topic || '—'}</div>

        {live && (
          <>
            <div className="mt-2"><Countdown endsAt={endsAt} size="text-3xl" /></div>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              className="mt-3 w-full clay-inset px-4 py-4 text-xl text-center"
              placeholder="생각나는 대로 계속!"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <Button className="mt-2 w-full" onClick={add} disabled={!text.trim()}>추가 ({mine.length})</Button>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>남들이 안 쓸 것 같은 답일수록 이득 🤫</p>
          </>
        )}

        {idle && <p className="mt-6 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>⏳ 호스트가 시작하면 입력!</p>}

        {/* 내가 쓴 답 — 끝나면 유니크/겹침 표시 */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {(myRes ? myRes.items : mine.map((t) => ({ text: t }))).map((it, i) => (
            <span key={i} className="clay-inset px-2.5 py-1 text-sm"
              style={myRes ? (it.uniq ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--c-coral)', color: '#fff' }) : undefined}>
              {myRes ? (it.uniq ? '✅ ' : '💥 ') : ''}{it.text}
            </span>
          ))}
        </div>

        {done && (
          myRes ? (
            <p className="mt-3 font-display text-2xl animate-pop" style={{ color: 'var(--c-mint)' }}>
              {myRes.uniq}점 <span className="text-base" style={{ color: 'var(--ink-soft)' }}>(겹쳐서 날아간 답 {myRes.dup}개)</span>
            </p>
          ) : (
            <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>🙈 하나도 못 썼어요…</p>
          )
        )}
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
