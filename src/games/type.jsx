// ④ 타이핑 — 모드: sync(싱크로 일치) / rolling(익명 롤링) / relay(줄줄이 릴레이)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, dbTransaction, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MODES = [
  { id: 'sync', label: '싱크로', emoji: '💞' },
  { id: 'rolling', label: '롤링', emoji: '💌' },
  { id: 'relay', label: '줄줄이', emoji: '🎤' },
]
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')
const HUES = ['var(--c-sky)', 'var(--c-pink)', 'var(--c-mint)', 'var(--c-lemon)', 'var(--c-grape)', 'var(--c-coral)']
const RELAY_SEC = 60

/* ── 싱크로 ── */
function SyncHost({ base, meta, players }) {
  const raw = useValue(`${base}/word`)
  const groups = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const g = {}
    toList(raw).forEach((e) => {
      const k = norm(e.value)
      if (k) (g[k] = g[k] || []).push(byId[e.id]?.nickname || e.id)
    })
    return Object.entries(g).map(([w, names]) => ({ w, names, c: names.length })).sort((a, b) => b.c - a.c)
  }, [raw, players])
  const reveal = meta.roundStatus === 'reveal'
  return (
    <div className="text-center">
      <div className="font-display text-2xl">{meta.prompt || '제시어'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{toList(raw).length}/{players.length} 제출</div>
      {reveal ? (
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {groups.map((g) => (
            <div key={g.w} className="clay flex items-center justify-between px-4 py-3" style={{ background: g.c >= 2 ? 'var(--c-mint)' : 'var(--surface)', color: g.c >= 2 ? '#fff' : 'var(--ink)' }}>
              <div><span className="font-display text-xl">{g.w}</span> <span className="text-sm opacity-70">{g.names.join(', ')}</span></div>
              <span className="font-display text-2xl">{g.c}{g.c >= 2 && '💞'}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>제출 대기 중…</p>}
    </div>
  )
}

function SyncPlayer({ base, meta, me }) {
  const mine = useValue(`${base}/word/${me.id}`)
  const [text, setText] = useState('')
  const open = meta.roundStatus === 'open'
  return (
    <div className="text-center">
      <p style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '제시어에 맞는 단어'}</p>
      <input value={text} onChange={(e) => setText(e.target.value)} disabled={!open} className="mt-3 w-full clay-inset px-4 py-4 text-xl text-center" placeholder="팀원과 텔레파시!" onKeyDown={(e) => e.key === 'Enter' && text.trim() && dbSet(`${base}/word/${me.id}`, text.trim())} />
      <Button className="mt-3 w-full" onClick={() => text.trim() && dbSet(`${base}/word/${me.id}`, text.trim())} disabled={!open || !text.trim()}>제출 {mine && '(수정)'}</Button>
      {mine && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: {mine}</p>}
    </div>
  )
}

/* ── 롤링 ── */
function RollingHost({ base, meta, players }) {
  const targetId = useValue(`${base}/targetId`)
  const posts = toList(useValue(`${base}/posts`))
  const target = players.find((p) => p.id === targetId)
  if (!targetId)
    return (
      <div className="text-center">
        <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>고백 대상을 지목하세요.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (<Button key={p.id} variant="ghost" onClick={() => dbSet(`${base}/targetId`, p.id)}>{p.nickname}</Button>))}
        </div>
      </div>
    )
  return (
    <div>
      <div className="text-center"><span style={{ color: 'var(--ink-soft)' }}>TO. </span><span className="font-display text-3xl">{target?.nickname}</span><div style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '익명 한 줄'}</div></div>
      <div className="mt-4 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
        {posts.map((m, i) => (
          <div key={m.id} className="animate-pop clay px-4 py-3 font-bold" style={{ background: HUES[i % HUES.length], color: '#fff', transform: `rotate(${((i % 5) - 2) * 2}deg)`, fontSize: `${1 + ((i * 7) % 5) * 0.12}rem` }}>{m.text}</div>
        ))}
        {!posts.length && <p className="py-8" style={{ color: 'var(--ink-soft)' }}>익명 고백 대기 중… 💌</p>}
      </div>
    </div>
  )
}

function RollingPlayer({ base, meta, players, me }) {
  const targetId = useValue(`${base}/targetId`)
  const open = meta.roundStatus === 'open'
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const target = players.find((p) => p.id === targetId)
  if (!targetId) return <Waiting text="대상 지목 대기 중… 💌" />
  const send = () => {
    if (!text.trim()) return
    dbPush(`${base}/posts`, { text: text.trim(), ts: Date.now() })
    setText('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }
  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>TO.</div>
      <div className="font-display text-2xl">{target?.nickname}</div>
      <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '익명으로 한 줄'}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!open} rows={2} className="mt-3 w-full clay-inset px-4 py-3 resize-none" placeholder="완벽 익명 😈" />
      <Button className="mt-2 w-full" onClick={send} disabled={!open || !text.trim()}>{sent ? '전송됨 💌' : '익명 전송'}</Button>
    </div>
  )
}

/* ── 줄줄이 릴레이 ── */
function RelayHost({ base, teams }) {
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`)
  const endsAt = useValue(`${base}/endsAt`)
  const entries = toList(useValue(`${base}/entries`))
  const start = (team) => {
    const members = shuffle(team.members)
    dbUpdate(base, { order: members.map((m) => ({ id: m.id, nickname: m.nickname })), idx: 0, endsAt: Date.now() + RELAY_SEC * 1000, entries: null })
  }
  const current = order?.[idx]
  const finished = order && idx >= order.length
  if (!order)
    return (
      <div className="text-center">
        <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>릴레이 팀 선택</p>
        <div className="flex justify-center gap-2">{teams.map((t) => (<Button key={t.id} variant="ghost" onClick={() => start(t)} disabled={!t.members.length}>{t.emoji} {t.name} ({t.members.length})</Button>))}</div>
      </div>
    )
  return (
    <div className="text-center">
      <Countdown endsAt={endsAt} />
      <div style={{ color: 'var(--ink-soft)' }}>{Math.min(idx, order.length)}/{order.length}</div>
      {!finished && current && <div className="font-display text-5xl mt-2 animate-pop">🎤 {current.nickname}</div>}
      {finished && <div className="font-display text-4xl mt-2" style={{ color: 'var(--c-mint)' }}>완주! 🎉</div>}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {entries.map((e) => (<span key={e.id} className="clay-inset px-3 py-1.5 font-bold">{e.text}</span>))}
      </div>
    </div>
  )
}

function RelayPlayer({ base, me }) {
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`)
  const endsAt = useValue(`${base}/endsAt`)
  const inputRef = useRef(null)
  const wasMyTurn = useRef(false)
  const inOrder = order?.some((o) => o.id === me.id)
  const isMyTurn = order && order[idx]?.id === me.id
  const finished = order && idx >= order.length
  const timeUp = endsAt && Date.now() > endsAt
  useEffect(() => {
    if (isMyTurn && !wasMyTurn.current) {
      if (navigator.vibrate) navigator.vibrate([120, 60, 120])
      inputRef.current?.focus()
    }
    wasMyTurn.current = isMyTurn
  }, [isMyTurn])
  const submit = () => {
    const text = inputRef.current?.value.trim()
    if (!text || !isMyTurn) return
    dbPush(`${base}/entries`, { text, by: me.nickname })
    dbTransaction(`${base}/idx`, (cur) => (cur || 0) + 1)
    inputRef.current.value = ''
  }
  if (!order) return <Waiting text="순서 정하는 중…" />
  if (!inOrder) return <Waiting text="다른 팀 차례예요 🍿" />
  if (finished) return <Waiting text="릴레이 종료!" />
  return (
    <div className="text-center">
      <Countdown endsAt={endsAt} size="text-4xl" />
      {isMyTurn && !timeUp ? (
        <div className="mt-3">
          <div className="font-display text-2xl" style={{ color: 'var(--c-coral)' }}>🔥 내 차례!</div>
          <input ref={inputRef} className="mt-2 w-full clay-inset px-4 py-4 text-xl text-center" placeholder="빨리 입력!" onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <Button className="mt-2 w-full" onClick={submit}>전송 → 다음</Button>
        </div>
      ) : <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>{timeUp ? '시간 종료 ⏱️' : `‘${order[idx]?.nickname}’ 차례…`}</p>}
    </div>
  )
}

function Waiting({ text }) {
  return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>{text}</p>
}
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── 래퍼 ── */
function HostView({ base, meta, players, teams }) {
  const mode = useValue(`${base}/mode`) || 'sync'
  return (
    <div>
      {meta.roundStatus === 'staged' && (
        <div className="text-center mb-4"><ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} /></div>
      )}
      {mode === 'sync' && <SyncHost base={base} meta={meta} players={players} />}
      {mode === 'rolling' && <RollingHost base={base} meta={meta} players={players} />}
      {mode === 'relay' && <RelayHost base={base} teams={teams} />}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const mode = useValue(`${base}/mode`) || 'sync'
  if (mode === 'sync') return <SyncPlayer base={base} meta={meta} me={me} />
  if (mode === 'rolling') return <RollingPlayer base={base} meta={meta} players={players} me={me} />
  return <RelayPlayer base={base} me={me} />
}

export default {
  id: 'type',
  name: '타이핑',
  emoji: '⌨️',
  tagline: '싱크로 · 롤링 · 줄줄이',
  promptLabel: '제시어/질문',
  HostView,
  PlayerView,
}
