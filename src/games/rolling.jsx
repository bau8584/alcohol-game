// 익명편지 — 두 가지 방식.
//  🎯 지목 모드: 호스트가 한 명을 지목 → 모두가 그 사람에게 익명 한 줄.
//  ✍️ 자유 모드: 각자 원하는 사람을 골라 익명으로 보냄 → 호스트가 받는 사람별로 공개.
// 공개는 진행자가('공개'). '이름 밝히기'로 작성자 공개 가능.
import { useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList } from '../lib/db'
import { setRoundStatus } from '../lib/actions'
import { Button } from '../components/ui'

const HUES = ['var(--c-sky)', 'var(--c-pink)', 'var(--c-mint)', 'var(--c-lemon)', 'var(--c-grape)', 'var(--c-coral)']

function LetterCard({ m, i, named }) {
  return (
    <div className="animate-pop clay px-4 py-3 font-bold" style={{ background: HUES[i % HUES.length], color: '#fff', transform: `rotate(${((i % 5) - 2) * 2}deg)`, fontSize: `${1 + ((i * 7) % 5) * 0.12}rem` }}>
      {m.text}
      {named && m.by && <div className="text-xs mt-1 opacity-90 text-right">— {m.by}</div>}
    </div>
  )
}

/* ═══════════════════ 호스트 ═══════════════════ */
function HostView({ roomId, base, meta, players }) {
  const mode = useValue(`${base}/mode`)

  if (!mode) {
    const pickMode = (m) => {
      dbUpdate(base, { mode: m, targetId: null, posts: null, named: null })
      if (m === 'free') setRoundStatus(roomId, 'open') // 자유 모드는 바로 수집 시작
    }
    return (
      <div className="text-center">
        <p className="mb-4 font-display text-xl">💌 어떤 방식으로 할까요?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          <button onClick={() => pickMode('target')} className="clay-btn p-5 text-left" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
            <div className="text-3xl">🎯</div>
            <div className="font-display text-lg mt-1">지목 모드</div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>한 명 지목 → 모두가 그 사람에게</div>
          </button>
          <button onClick={() => pickMode('free')} className="clay-btn p-5 text-left" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
            <div className="text-3xl">✍️</div>
            <div className="font-display text-lg mt-1">자유 모드</div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>각자 원하는 사람에게 보내기</div>
          </button>
        </div>
      </div>
    )
  }

  const backMode = () => { dbSet(base, null); setRoundStatus(roomId, 'staged') }
  return mode === 'free'
    ? <FreeHost base={base} meta={meta} players={players} onBack={backMode} />
    : <TargetHost roomId={roomId} base={base} meta={meta} players={players} onBack={backMode} />
}

// 🎯 지목 모드 (기존 방식)
function TargetHost({ roomId, base, meta, players, onBack }) {
  const targetId = useValue(`${base}/targetId`)
  const posts = toList(useValue(`${base}/posts`))
  const named = useValue(`${base}/named`)
  const target = players.find((p) => p.id === targetId)
  const reveal = meta.roundStatus === 'reveal'

  const pickTarget = (pid) => {
    dbUpdate(base, { targetId: pid, posts: null, named: null })
    setRoundStatus(roomId, 'open')
  }

  if (!targetId)
    return (
      <div className="text-center">
        <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>편지 받을 사람을 지목하면 바로 편지를 받아요. 💌</p>
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (<Button key={p.id} variant="ghost" onClick={() => pickTarget(p.id)}>{p.nickname}</Button>))}
        </div>
        <button className="mt-4 text-xs underline" style={{ color: 'var(--ink-soft)' }} onClick={onBack}>↩ 모드 다시 고르기</button>
      </div>
    )

  return (
    <div>
      <div className="text-center">
        <span style={{ color: 'var(--ink-soft)' }}>TO. </span>
        <span className="font-display text-3xl">{target?.nickname}</span>
        <div style={{ color: 'var(--ink-soft)' }}>{posts.length}통 도착</div>
        <button className="mt-1 text-xs underline" style={{ color: 'var(--ink-soft)' }} onClick={() => dbSet(`${base}/targetId`, null)}>대상 바꾸기</button>
      </div>

      {reveal ? (
        <>
          <div className="mt-3 text-center">
            <Button variant="ghost" onClick={() => dbSet(`${base}/named`, !named)}>
              {named ? '🙈 다시 익명으로' : '🙋 이름 밝히기'}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {posts.map((m, i) => (<LetterCard key={m.id} m={m} i={i} named={named} />))}
            {!posts.length && <p className="py-8" style={{ color: 'var(--ink-soft)' }}>도착한 편지가 없어요. 💌</p>}
          </div>
        </>
      ) : (
        <p className="mt-6 text-center text-xl font-display" style={{ color: 'var(--ink-soft)' }}>
          편지 받는 중… 👁 ‘공개’를 누르면 편지가 뜹니다
        </p>
      )}
    </div>
  )
}

// ✍️ 자유 모드 — 받는 사람별로 묶어서 공개
function FreeHost({ base, meta, players, onBack }) {
  const posts = toList(useValue(`${base}/posts`))
  const named = useValue(`${base}/named`)
  const reveal = meta.roundStatus === 'reveal'
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const groups = players
    .map((p) => ({ p, letters: posts.filter((m) => m.toId === p.id) }))
    .filter((g) => g.letters.length)
    .sort((a, b) => b.letters.length - a.letters.length)

  return (
    <div>
      <div className="text-center">
        <span className="font-display text-2xl">✍️ 자유 익명편지</span>
        <div style={{ color: 'var(--ink-soft)' }}>{posts.length}통 도착 · 받은 사람 {groups.length}명</div>
        <button className="mt-1 text-xs underline" style={{ color: 'var(--ink-soft)' }} onClick={onBack}>↩ 모드 다시 고르기</button>
      </div>

      {reveal ? (
        <>
          <div className="mt-3 text-center">
            <Button variant="ghost" onClick={() => dbSet(`${base}/named`, !named)}>
              {named ? '🙈 다시 익명으로' : '🙋 이름 밝히기'}
            </Button>
          </div>
          <div className="mt-4 space-y-4 max-w-3xl mx-auto">
            {groups.map(({ p, letters }) => (
              <div key={p.id} className="clay-inset p-4">
                <div className="text-center mb-2"><span style={{ color: 'var(--ink-soft)' }}>TO. </span><span className="font-display text-2xl">{p.nickname}</span> <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({letters.length}통)</span></div>
                <div className="flex flex-wrap justify-center gap-3">
                  {letters.map((m, i) => (<LetterCard key={m.id} m={m} i={i} named={named} />))}
                </div>
              </div>
            ))}
            {!groups.length && <p className="py-8 text-center" style={{ color: 'var(--ink-soft)' }}>도착한 편지가 없어요. 💌</p>}
          </div>
        </>
      ) : (
        <div className="mt-5 text-center">
          <p className="text-xl font-display" style={{ color: 'var(--ink-soft)' }}>자유 익명편지 받는 중… 👁 ‘공개’를 누르면 뜹니다</p>
          {groups.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {groups.map(({ p, letters }) => (
                <span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{byId[p.id]?.nickname} <b>{letters.length}</b></span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════ 플레이어 ═══════════════════ */
function PlayerView({ base, meta, players, me }) {
  const mode = useValue(`${base}/mode`)
  if (!mode) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자가 방식을 고르는 중… 💌</p>
  return mode === 'free'
    ? <FreePlayer base={base} meta={meta} players={players} me={me} />
    : <TargetPlayer base={base} meta={meta} players={players} me={me} />
}

// 🎯 지목 모드 플레이어 (기존)
function TargetPlayer({ base, meta, players, me }) {
  const targetId = useValue(`${base}/targetId`)
  const open = meta.roundStatus === 'open'
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const target = players.find((p) => p.id === targetId)
  if (!targetId) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>대상 지목 대기 중… 💌</p>
  const send = () => {
    if (!text.trim() || !open) return
    dbPush(`${base}/posts`, { text: text.trim(), by: me.nickname, toId: targetId, ts: Date.now() })
    setText('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }
  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>TO.</div>
      <div className="font-display text-2xl">{target?.nickname}</div>
      <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>익명으로 한 줄 💌</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!open} rows={2} className="mt-3 w-full clay-inset px-4 py-3 resize-none" placeholder="완벽 익명 😈" />
      <Button className="mt-2 w-full" onClick={send} disabled={!open || !text.trim()}>{sent ? '전송됨 💌' : '익명 전송'}</Button>
      {open ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>여러 번 보낼 수 있어요. 진행자가 공개할 때까지 안 보여요.</p>
      ) : (
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>편지 공개 중 🔒</p>
      )}
    </div>
  )
}

// ✍️ 자유 모드 플레이어 — 받는 사람 직접 선택
function FreePlayer({ base, meta, players, me }) {
  const open = meta.roundStatus === 'open'
  const [toId, setToId] = useState(null)
  const [text, setText] = useState('')
  const [count, setCount] = useState(0)
  const [sent, setSent] = useState(false)
  const candidates = players.filter((p) => p.id !== me.id)
  const toName = players.find((p) => p.id === toId)?.nickname

  const send = () => {
    if (!open) return
    if (!toId) return alert('받는 사람을 먼저 고르세요.')
    if (!text.trim()) return
    dbPush(`${base}/posts`, { text: text.trim(), by: me.nickname, toId, ts: Date.now() })
    setText('')
    setCount((c) => c + 1)
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }

  if (!open) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>편지 공개 중 🔒 · 메인 화면 확인!</p>

  return (
    <div>
      <p className="text-center font-display text-lg">💌 누구에게 익명 편지를?</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => setToId(p.id)}
            className="clay-btn py-2.5 font-display"
            style={toId === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}
          </button>
        ))}
        {!candidates.length && <p className="col-span-2 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>다른 참가자가 없어요.</p>}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-3 w-full clay-inset px-4 py-3 resize-none" placeholder={toName ? `${toName} 에게… (완벽 익명 😈)` : '받는 사람을 고르세요'} />
      <Button className="mt-2 w-full" onClick={send} disabled={!toId || !text.trim()}>{sent ? '전송됨 💌' : toName ? `${toName} 에게 익명 전송` : '익명 전송'}</Button>
      <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
        {count > 0 ? `내가 보낸 편지 ${count}통 · ` : ''}여러 사람에게 여러 번 보낼 수 있어요. 진행자가 공개할 때까지 비밀 🤫
      </p>
    </div>
  )
}

export default {
  id: 'rolling',
  name: '익명편지',
  emoji: '💌',
  tagline: '익명 편지 · 지목/자유 · 공개는 진행자가',
  genres: ['party'],
  traits: ['anon', 'solo'],
  controls: { start: false }, // 지목/자유 모드 진입이 곧 시작 (공개/새 라운드만)
  HostView,
  PlayerView,
}
