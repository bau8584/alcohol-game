// 3. 줄줄이 말해요 — 팀원에게 순차로 입력창이 넘어가는 타임밤 릴레이.
import { useEffect, useRef } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, dbTransaction, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import { Button } from '../components/ui'

const DURATION = 60 // 초

function HostView({ base, meta, teams }) {
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`)
  const endsAt = useValue(`${base}/endsAt`)
  const entriesRaw = useValue(`${base}/entries`)
  const entries = toList(entriesRaw)

  const startTeam = (team) => {
    const members = [...team.members]
    // Fisher–Yates 셔플 (호스트 브라우저에서 실행)
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[members[i], members[j]] = [members[j], members[i]]
    }
    dbUpdate(base, {
      order: members.map((m) => ({ id: m.id, nickname: m.nickname })),
      idx: 0,
      endsAt: Date.now() + DURATION * 1000,
      entries: null,
    })
  }

  const current = order?.[idx]
  const finished = order && idx >= order.length

  return (
    <div className="text-center">
      {!order && (
        <div>
          <p className="text-white/60 mb-3">릴레이를 진행할 팀을 선택하세요.</p>
          <div className="flex justify-center gap-2">
            {teams.map((t) => (
              <Button key={t.id} onClick={() => startTeam(t)} variant="ghost" disabled={!t.members.length}>
                {t.emoji} {t.name} ({t.members.length})
              </Button>
            ))}
          </div>
        </div>
      )}
      {order && (
        <div>
          <Countdown endsAt={endsAt} />
          <div className="mt-2 text-white/50">
            진행 {Math.min(idx, order.length)}/{order.length}
          </div>
          {!finished && current && (
            <div className="mt-3 text-5xl font-black animate-pop">🎤 {current.nickname}</div>
          )}
          {finished && <div className="mt-3 text-4xl font-black text-emerald-400">전원 완주! 🎉</div>}
          <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {entries.map((e) => (
              <span key={e.id} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold">
                {e.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`)
  const endsAt = useValue(`${base}/endsAt`)
  const inputRef = useRef(null)
  const wasMyTurn = useRef(false)

  const inOrder = order?.some((o) => o.id === me.id)
  const isMyTurn = order && order[idx]?.id === me.id
  const finished = order && idx >= order.length
  const timeUp = endsAt && Date.now() > endsAt

  // 내 차례가 되는 순간 진동 알림
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

  if (!order) return <p className="text-center text-white/50">진행자가 팀과 순서를 정하는 중…</p>
  if (!inOrder) return <p className="text-center text-white/50">이번 릴레이는 다른 팀 차례입니다. 🍿</p>
  if (finished) return <p className="text-center text-emerald-400 font-bold">릴레이 종료!</p>

  return (
    <div className="text-center">
      <Countdown endsAt={endsAt} size="text-4xl" />
      {isMyTurn && !timeUp ? (
        <div className="mt-4">
          <div className="text-2xl font-black text-rose-400 animate-pulse">🔥 내 차례!</div>
          <input
            ref={inputRef}
            className="mt-3 w-full rounded-xl bg-white/10 px-4 py-4 text-xl text-center outline-none"
            placeholder="빨리 입력하고 전송!"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button className="mt-3 w-full" onClick={submit}>
            전송 → 다음 사람
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-white/50">
          {timeUp ? '시간 종료 ⏱️' : `‘${order[idx]?.nickname}’ 차례… 대기 중`}
        </p>
      )}
    </div>
  )
}

export default {
  id: 'relay',
  name: '줄줄이 말해요',
  emoji: '🎤',
  tagline: '순차 입력 타임밤 릴레이',
  promptLabel: '주제 (예: 아이스크림 종류 이어말하기)',
  HostView,
  PlayerView,
}
