// 폭탄 끝말잇기 — 턴제. 주제(예: '과일 이름')를 주고 순서대로 돌아가며 답을 말하고(오프라인),
// 내 폰의 '넘기기'를 눌러 다음 사람에게. 숨은 폭탄(랜덤 시각)이 터지는 순간의 턴 사람이 벌칙.
// 폭탄 시각은 serverNow 기준, 선언은 setTimeout(호스트 백그라운드여도 발화). 개인전.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction, serverNow } from '../lib/db'
import { Button } from '../components/ui'

const MIN_MS = 15000
const MAX_EXTRA = 30000 // 폭탄 15~45초
const TOPICS = [
  '과일 이름', '동물 이름', '나라 이름', '가수·아이돌 이름', '음식 이름',
  '영화 제목', '브랜드 이름', '4글자 단어', 'ㅅ으로 시작하는 말', '노래 제목',
  '스포츠 종목', '색깔 이름', '직업 이름', '지하철 역 이름', '과자 이름',
]

const shuffle = (a) => {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function useTick(on) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!on) return
    const iv = setInterval(() => set((n) => n + 1), 200)
    return () => clearInterval(iv)
  }, [on])
}

function HostView({ base, players }) {
  const order = useValue(`${base}/order`)
  const turn = useValue(`${base}/turn`) || 0
  const boomAt = useValue(`${base}/boomAt`)
  const boomedAt = useValue(`${base}/boomedAt`)
  const loserPid = useValue(`${base}/loserPid`)
  const topic = useValue(`${base}/topic`)
  const live = players.filter((p) => p.connected !== false)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const started = !!order
  const running = started && !boomedAt
  useTick(running)

  const curPid = order?.[turn % (order?.length || 1)]
  const nextPid = order?.[(turn + 1) % (order?.length || 1)]

  // 폭탄 선언 — 터지는 순간의 턴 사람을 loser로 확정 (setTimeout, 백그라운드 안전)
  useEffect(() => {
    if (!running || !boomAt) return
    const id = setTimeout(() => {
      dbTransaction(`${base}/boomedAt`, (cur) => cur || boomAt).then((r) => {
        if (r.committed) dbSet(`${base}/loserPid`, curPid)
      })
    }, Math.max(0, boomAt - serverNow()))
    return () => clearTimeout(id)
  }, [running, boomAt, base, curPid])

  const start = () => {
    const ord = shuffle(live.map((p) => p.id))
    const t = serverNow()
    dbUpdate(base, { order: ord, turn: 0, boomAt: t + MIN_MS + Math.floor(Math.random() * MAX_EXTRA), boomedAt: null, loserPid: null, topic: topic || TOPICS[Math.floor(Math.random() * TOPICS.length)] })
  }
  const reset = () => dbUpdate(base, { order: null, turn: 0, boomAt: null, boomedAt: null, loserPid: null })
  const rollTopic = () => dbSet(`${base}/topic`, TOPICS[Math.floor(Math.random() * TOPICS.length)])

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ok" onClick={start} disabled={live.length < 2}>{started ? '🔄 새 판' : '💣 시작'}</Button>
        {started && <Button variant="ghost" onClick={reset}>■ 정지</Button>}
        {!started && <button onClick={rollTopic} className="clay-btn px-4 py-2 text-xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="주제 랜덤">🎲</button>}
      </div>

      <div className="mt-3 clay-inset py-3">
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제</div>
        <div className="font-display text-3xl">{topic || '🎲로 주제 뽑기'}</div>
      </div>

      {!started ? (
        <p className="mt-4 font-display text-lg" style={{ color: 'var(--ink-soft)' }}>
          순서대로 답 말하고 넘기기 · 폭탄 터질 때 걸린 사람 벌칙 🍺
          {live.length < 2 && <span className="block text-sm mt-1" style={{ color: 'var(--c-coral)' }}>2명 이상 필요</span>}
        </p>
      ) : boomedAt ? (
        <div className="mt-5 clay p-4 animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
          <div className="font-display text-3xl">💥 펑!</div>
          <div className="font-display text-2xl mt-1">{byId[loserPid]?.nickname || '?'} 벌칙 🍺</div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>지금 차례</div>
          <div className="font-display text-5xl animate-pulse" style={{ color: 'var(--c-coral)' }}>{byId[curPid]?.nickname || '?'}</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>다음 → {byId[nextPid]?.nickname || '?'}</div>
          <div className="mt-3 text-4xl">💣 {'🔥'.repeat(1)}</div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, players, me }) {
  const order = useValue(`${base}/order`)
  const turn = useValue(`${base}/turn`) || 0
  const boomedAt = useValue(`${base}/boomedAt`)
  const loserPid = useValue(`${base}/loserPid`)
  const topic = useValue(`${base}/topic`)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const started = !!order
  const curPid = order?.[turn % (order?.length || 1)]
  const myTurn = started && !boomedAt && curPid === me.id
  const iLost = boomedAt && loserPid === me.id

  const pass = () => {
    if (!myTurn) return
    // 내 차례일 때만 턴+1 (동시성 방지: 현재 turn 기준으로만 증가)
    dbTransaction(`${base}/turn`, (cur) => ((cur || 0) === turn ? turn + 1 : undefined))
    if (navigator.vibrate) navigator.vibrate(20)
  }

  if (!started) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">💣</div>
        <p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 순서가 정해져요</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제</div>
      <div className="font-display text-2xl">{topic}</div>

      {boomedAt ? (
        <div className="mt-5">
          <div className={`rounded-3xl py-12 font-display text-4xl ${iLost ? 'animate-pop' : ''}`} style={{ background: iLost ? 'var(--c-coral)' : 'var(--surface-2)', color: iLost ? '#fff' : 'var(--ink-soft)' }}>
            {iLost ? '💥 나 걸렸다!' : `💥 ${byId[loserPid]?.nickname || '?'} 걸림`}
          </div>
          {iLost && <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>벌칙 🍺</p>}
        </div>
      ) : myTurn ? (
        <button onPointerDown={pass}
          className="mt-4 w-full h-64 rounded-3xl font-display text-4xl clay-btn"
          style={{ background: 'var(--c-coral)', color: '#fff' }}>
          🗣️ 내 차례!
          <div className="text-xl mt-2 opacity-90">답 말하고 → 넘기기</div>
        </button>
      ) : (
        <div className="mt-4 rounded-3xl py-16" style={{ background: 'var(--surface-2)' }}>
          <div className="font-display text-3xl" style={{ color: 'var(--ink-soft)' }}>{byId[curPid]?.nickname || '?'} 차례</div>
          <div className="text-sm mt-2" style={{ color: 'var(--ink-soft)' }}>내 차례 오면 폭탄 조심 💣</div>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bombword',
  name: '폭탄 끝말잇기',
  emoji: '💣',
  tagline: '턴제 · 폭탄 터질 때 걸린 사람 벌칙',
  genres: ['brain'],
  traits: ['solo'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
