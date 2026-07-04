// 5. 라이어 게임 — 시스템이 각 폰에 역할/제시어를 개별 비공개 전송.
import { useState } from 'react'
import { useValue, dbSet } from '../lib/db'
import { Button, TeamBadge } from '../components/ui'

function HostView({ base, meta, players }) {
  const assign = useValue(`${base}/assign`)
  const [liarCount, setLiarCount] = useState(1)
  const word = meta.prompt

  const distribute = () => {
    if (!word) return alert('먼저 상단 제시어를 입력하세요.')
    if (players.length < 3) return alert('최소 3명 필요합니다.')
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const liars = shuffled.slice(0, liarCount)
    const liarIds = liars.reduce((a, p) => ((a[p.id] = true), a), {})
    dbSet(`${base}/assign`, { word, liarIds, at: Date.now() })
  }

  const liarNames = assign
    ? players.filter((p) => assign.liarIds?.[p.id]).map((p) => p.nickname)
    : []

  return (
    <div className="text-center">
      <div className="text-2xl font-black">제시어: {word || '(상단에 입력)'}</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-white/60">라이어 수</span>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setLiarCount(n)}
            className={`w-9 h-9 rounded-lg font-bold ${liarCount === n ? 'bg-indigo-500' : 'bg-white/10'}`}
          >
            {n}
          </button>
        ))}
        <Button variant="warn" onClick={distribute}>
          역할 배분
        </Button>
      </div>
      {assign && (
        <div className="mt-5">
          <p className="text-white/50">배분 완료 · 각자 폰에서 확인</p>
          <p className="mt-2 text-rose-400 font-bold">
            🤥 라이어(진행자만 보임): {liarNames.join(', ')}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {players.map((p) => (
              <span key={p.id} className="rounded bg-white/5 px-2 py-1 text-sm">
                {p.nickname}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const assign = useValue(`${base}/assign`)
  const [peek, setPeek] = useState(false)

  if (!assign) return <p className="text-center text-white/50">진행자가 역할을 배분하는 중… 🤫</p>
  const amLiar = !!assign.liarIds?.[me.id]

  return (
    <div className="text-center">
      <p className="text-white/50 mb-3">주변에 화면을 보이지 마세요 🙈</p>
      {!peek ? (
        <Button className="w-full py-6 text-xl" variant="ghost" onClick={() => setPeek(true)}>
          👆 눌러서 내 역할 확인
        </Button>
      ) : (
        <div
          className={`rounded-2xl p-8 ${amLiar ? 'bg-rose-600/30 border border-rose-400' : 'bg-emerald-600/20 border border-emerald-400'}`}
        >
          {amLiar ? (
            <>
              <div className="text-4xl font-black text-rose-300">당신은 라이어 🤥</div>
              <p className="mt-3 text-white/70">제시어를 모릅니다. 들키지 말고 아는 척하세요!</p>
            </>
          ) : (
            <>
              <div className="text-white/60">제시어</div>
              <div className="mt-1 text-4xl font-black">{assign.word}</div>
              <p className="mt-3 text-white/70">이 안에 라이어가 숨어 있습니다.</p>
            </>
          )}
          <button className="mt-4 text-sm text-white/40 underline" onClick={() => setPeek(false)}>
            가리기
          </button>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'liar',
  name: '라이어 게임',
  emoji: '🤥',
  tagline: '개별 비공개 역할 전송',
  promptLabel: '제시어 (라이어만 모름)',
  HostView,
  PlayerView,
}
