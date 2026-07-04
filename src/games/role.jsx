// ③ 히든롤 — 모드: liar(라이어) / mafia(마피아, 밤 익명채팅)
import { useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList } from '../lib/db'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MODES = [
  { id: 'liar', label: '라이어', emoji: '🤥' },
  { id: 'mafia', label: '마피아', emoji: '🕵️' },
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── 라이어 ── */
function LiarHost({ base, meta, players }) {
  const assign = useValue(`${base}/assign`)
  const [n, setN] = useState(1)
  const distribute = () => {
    if (!meta.prompt) return alert('상단 제시어를 먼저 입력하세요.')
    if (players.length < 3) return alert('최소 3명 필요.')
    const liars = shuffle(players).slice(0, n)
    const liarIds = liars.reduce((a, p) => ((a[p.id] = true), a), {})
    dbSet(`${base}/assign`, { word: meta.prompt, liarIds })
  }
  const liarNames = assign ? players.filter((p) => assign.liarIds?.[p.id]).map((p) => p.nickname) : []
  return (
    <div className="text-center">
      <div className="font-display text-2xl">제시어: {meta.prompt || '(상단 입력)'}</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span style={{ color: 'var(--ink-soft)' }}>라이어</span>
        {[1, 2, 3].map((k) => (
          <button key={k} onClick={() => setN(k)} className="w-9 h-9 rounded-xl font-display clay-btn" style={n === k ? { background: 'var(--c-grape)' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{k}</button>
        ))}
        <Button variant="warn" onClick={distribute}>역할 배분</Button>
      </div>
      {assign && (
        <p className="mt-4 font-bold" style={{ color: 'var(--c-coral)' }}>🤥 라이어(진행자만): {liarNames.join(', ')}</p>
      )}
    </div>
  )
}

function LiarPlayer({ base, me }) {
  const assign = useValue(`${base}/assign`)
  const [peek, setPeek] = useState(false)
  if (!assign) return <Waiting text="역할 배분 대기 중… 🤫" />
  const amLiar = !!assign.liarIds?.[me.id]
  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>주변에 화면 보이지 마세요 🙈</p>
      {!peek ? (
        <Button variant="ghost" className="w-full py-6" onClick={() => setPeek(true)}>👆 내 역할 확인</Button>
      ) : (
        <div className="clay p-8" style={{ background: amLiar ? 'var(--c-coral)' : 'var(--c-mint)', color: '#fff' }}>
          {amLiar ? (
            <>
              <div className="font-display text-4xl">라이어 🤥</div>
              <p className="mt-2">제시어를 모릅니다. 들키지 마세요!</p>
            </>
          ) : (
            <>
              <div className="opacity-80">제시어</div>
              <div className="font-display text-4xl mt-1">{assign.word}</div>
            </>
          )}
          <button className="mt-4 text-sm underline opacity-80" onClick={() => setPeek(false)}>가리기</button>
        </div>
      )}
    </div>
  )
}

/* ── 마피아 ── */
const aliasOf = (ids, myId) => {
  const list = Object.keys(ids || {}).sort()
  const i = list.indexOf(myId)
  return i < 0 ? null : '마피아 ' + String.fromCharCode(65 + i)
}

function MafiaHost({ base, players }) {
  const setup = useValue(`${base}/setup`)
  const night = useValue(`${base}/night`)
  const chat = toList(useValue(`${base}/chat`)).sort((a, b) => (a.ts || 0) - (b.ts || 0))
  const [n, setN] = useState(3)
  const assign = () => {
    if (players.length < n + 1) return alert('인원이 부족합니다.')
    const mafiaIds = shuffle(players).slice(0, n).reduce((a, p) => ((a[p.id] = true), a), {})
    dbUpdate(base, { setup: { mafiaIds }, night: false, chat: null })
  }
  const names = setup ? players.filter((p) => setup.mafiaIds?.[p.id]).map((p) => p.nickname) : []
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <span style={{ color: 'var(--ink-soft)' }}>마피아</span>
        {[1, 2, 3, 4].map((k) => (
          <button key={k} onClick={() => setN(k)} className="w-9 h-9 rounded-xl font-display clay-btn" style={n === k ? { background: 'var(--c-coral)' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{k}</button>
        ))}
        <Button variant="danger" onClick={assign}>지정</Button>
      </div>
      {setup && (
        <div className="mt-4">
          <Button variant={night ? 'warn' : 'ghost'} onClick={() => dbSet(`${base}/night`, !night)}>{night ? '☀️ 낮으로' : '🌙 밤 시작'}</Button>
          <p className="mt-3 font-bold" style={{ color: 'var(--c-coral)' }}>🕵️ {names.join(', ')}</p>
          <div className="mt-3 mx-auto max-w-sm text-left clay-inset p-3 h-36 overflow-y-auto">
            {chat.map((m) => (<div key={m.id} className="text-sm"><b style={{ color: 'var(--c-coral)' }}>{m.alias}</b>: {m.text}</div>))}
            {!chat.length && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>채팅 모니터</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function MafiaPlayer({ base, me }) {
  const setup = useValue(`${base}/setup`)
  const night = useValue(`${base}/night`)
  const chat = toList(useValue(`${base}/chat`)).sort((a, b) => (a.ts || 0) - (b.ts || 0))
  const [peek, setPeek] = useState(false)
  const [msg, setMsg] = useState('')
  if (!setup) return <Waiting text="역할 배분 대기 중… 🤫" />
  const amMafia = !!setup.mafiaIds?.[me.id]
  const alias = aliasOf(setup.mafiaIds, me.id)
  const send = () => {
    if (!msg.trim()) return
    dbPush(`${base}/chat`, { alias, text: msg.trim(), ts: Date.now() })
    setMsg('')
  }
  if (night && !amMafia)
    return <div className="fixed inset-0 flex items-center justify-center text-2xl" style={{ background: '#000', color: '#555' }}>🌙 눈을 감으세요</div>
  if (night && amMafia)
    return (
      <div className="fixed inset-0 p-4 flex flex-col" style={{ background: '#111' }}>
        <div className="font-display" style={{ color: 'var(--c-coral)' }}>🕵️ {alias} · 마피아 채팅</div>
        <div className="flex-1 overflow-y-auto my-2 space-y-1">
          {chat.map((m) => (<div key={m.id} className={`text-sm ${m.alias === alias ? 'text-right' : ''}`} style={{ color: '#eee' }}><b style={{ color: 'var(--c-coral)' }}>{m.alias}</b> {m.text}</div>))}
        </div>
        <div className="flex gap-2">
          <input value={msg} onChange={(e) => setMsg(e.target.value)} className="flex-1 clay-inset px-3 py-3" placeholder="익명 지령…" onKeyDown={(e) => e.key === 'Enter' && send()} />
          <Button variant="danger" onClick={send}>전송</Button>
        </div>
      </div>
    )
  return (
    <div className="text-center">
      {!peek ? (
        <Button variant="ghost" className="w-full py-6" onClick={() => setPeek(true)}>👆 내 정체 확인</Button>
      ) : (
        <div className="clay p-8" style={{ background: amMafia ? 'var(--c-coral)' : 'var(--c-sky)', color: '#fff' }}>
          <div className="font-display text-4xl">{amMafia ? '🕵️ 마피아' : '😇 시민'}</div>
          <p className="mt-2">{amMafia ? '밤에 동료와 익명 채팅이 열려요.' : '밤엔 화면이 암전됩니다.'}</p>
          <button className="mt-4 text-sm underline opacity-80" onClick={() => setPeek(false)}>가리기</button>
        </div>
      )}
    </div>
  )
}

function Waiting({ text }) {
  return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>{text}</p>
}

/* ── 래퍼 ── */
function HostView({ base, meta, players }) {
  const mode = useValue(`${base}/mode`) || 'liar'
  return (
    <div>
      {meta.roundStatus === 'staged' && (
        <div className="text-center mb-4"><ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} /></div>
      )}
      {mode === 'liar' ? <LiarHost base={base} meta={meta} players={players} /> : <MafiaHost base={base} players={players} />}
    </div>
  )
}

function PlayerView({ base, me }) {
  const mode = useValue(`${base}/mode`) || 'liar'
  return mode === 'liar' ? <LiarPlayer base={base} me={me} /> : <MafiaPlayer base={base} me={me} />
}

export default {
  id: 'role',
  name: '히든롤',
  emoji: '🎭',
  tagline: '라이어 · 마피아',
  promptLabel: '제시어 (라이어 모드에서 사용)',
  HostView,
  PlayerView,
}
