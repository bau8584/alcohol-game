// 익명편지 — 특정 인물에게 익명 한 줄. 시작 후 편지를 모으고, '공개'를 눌러야 메인 스크린에 뜬다.
// 호스트는 '이름 밝히기'로 작성자를 공개할 수 있다.
import { useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList } from '../lib/db'
import { setRoundStatus } from '../lib/actions'
import { Button } from '../components/ui'

const HUES = ['var(--c-sky)', 'var(--c-pink)', 'var(--c-mint)', 'var(--c-lemon)', 'var(--c-grape)', 'var(--c-coral)']

function HostView({ roomId, base, meta, players }) {
  const targetId = useValue(`${base}/targetId`)
  const posts = toList(useValue(`${base}/posts`))
  const named = useValue(`${base}/named`)
  const target = players.find((p) => p.id === targetId)
  const reveal = meta.roundStatus === 'reveal'

  // 대상 지목 = 편지 받을 사람 확정 + 편지 즉시 받기 시작 (별도 시작 버튼 없음)
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
            {posts.map((m, i) => (
              <div key={m.id} className="animate-pop clay px-4 py-3 font-bold" style={{ background: HUES[i % HUES.length], color: '#fff', transform: `rotate(${((i % 5) - 2) * 2}deg)`, fontSize: `${1 + ((i * 7) % 5) * 0.12}rem` }}>
                {m.text}
                {named && m.by && <div className="text-xs mt-1 opacity-90 text-right">— {m.by}</div>}
              </div>
            ))}
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

function PlayerView({ base, meta, players, me }) {
  const targetId = useValue(`${base}/targetId`)
  const open = meta.roundStatus === 'open'
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const target = players.find((p) => p.id === targetId)
  if (!targetId) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>대상 지목 대기 중… 💌</p>
  const send = () => {
    if (!text.trim() || !open) return
    dbPush(`${base}/posts`, { text: text.trim(), by: me.nickname, ts: Date.now() })
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

export default {
  id: 'rolling',
  name: '익명편지',
  emoji: '💌',
  tagline: '익명 편지 · 공개는 진행자가',
  genres: ['party'],
  traits: ['anon', 'solo'],
  controls: { start: false }, // 대상 지목이 곧 시작 → 시작 버튼 없음 (공개/새 라운드만)
  HostView,
  PlayerView,
}
