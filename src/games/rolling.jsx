// 9. 롤링 마인드 — 특정 인물에게 익명 한 줄. 메인 스크린에 둥둥 떠다니는 롤링페이퍼.
import { useState } from 'react'
import { useValue, dbSet, dbPush, toList } from '../lib/db'
import { Button } from '../components/ui'

const HUES = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#34d399']

function HostView({ base, meta, players }) {
  const targetId = useValue(`${base}/targetId`)
  const posts = toList(useValue(`${base}/posts`))
  const target = players.find((p) => p.id === targetId)

  return (
    <div>
      {!targetId ? (
        <div className="text-center">
          <p className="text-white/60 mb-2">고백 대상을 지목하세요.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => dbSet(`${base}/targetId`, p.id)}
                className="rounded-lg bg-white/10 px-3 py-2 font-bold hover:bg-white/20"
              >
                {p.nickname}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center">
            <span className="text-white/50">TO. </span>
            <span className="text-3xl font-black">{target?.nickname}</span>
            <div className="text-white/60">{meta.prompt || '익명 한 줄 고백'}</div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {posts.map((m, i) => (
              <div
                key={m.id}
                className="animate-pop rounded-2xl px-4 py-3 font-bold shadow-lg"
                style={{
                  background: HUES[i % HUES.length] + '22',
                  color: HUES[i % HUES.length],
                  transform: `rotate(${((i % 5) - 2) * 2}deg)`,
                  fontSize: `${1 + ((i * 7) % 5) * 0.12}rem`,
                }}
              >
                {m.text}
              </div>
            ))}
            {!posts.length && <p className="text-white/40 py-8">익명 고백을 기다리는 중… 💌</p>}
          </div>
        </div>
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

  if (!targetId) return <p className="text-center text-white/50">진행자가 대상을 정하는 중… 💌</p>

  const send = () => {
    if (!text.trim()) return
    dbPush(`${base}/posts`, { text: text.trim(), ts: Date.now() })
    setText('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }

  return (
    <div className="text-center">
      <div className="text-white/50">TO.</div>
      <div className="text-2xl font-black">{target?.nickname}</div>
      <p className="mt-1 text-white/60">{meta.prompt || '익명으로 한 줄 남기기'}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!open}
        rows={2}
        className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 outline-none resize-none disabled:opacity-40"
        placeholder="완벽 익명 · 필체 흔적 없음 😈"
      />
      <Button className="mt-2 w-full" onClick={send} disabled={!open || !text.trim()}>
        {sent ? '전송됨 💌' : '익명 전송'}
      </Button>
      <p className="mt-2 text-xs text-white/40">여러 번 보낼 수 있어요.</p>
    </div>
  )
}

export default {
  id: 'rolling',
  name: '롤링 마인드',
  emoji: '💌',
  tagline: '익명 고백 롤링페이퍼',
  promptLabel: '고백 질문 (예: 오늘 밤 하고 싶은 말은?)',
  HostView,
  PlayerView,
}
