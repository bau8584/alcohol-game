// 7. 블라인드 옥션 — 패스권을 익명 입찰해 미션을 회피. 최저 입찰자가 벌칙.
import { useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { changeItem } from '../lib/actions'
import { Button } from '../components/ui'
import { itemById } from '../config/items'

function analyze(bidRaw, players) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const bids = toList(bidRaw)
    .map((b) => ({ id: b.id, amount: b.value ?? b.amount ?? 0, nickname: byId[b.id]?.nickname || b.id }))
    .sort((a, b) => a.amount - b.amount)
  const min = bids.length ? bids[0].amount : 0
  return { bids, min }
}

function HostView({ roomId, base, meta, players }) {
  const bidRaw = useValue(`${base}/bid`)
  const settled = useValue(`${base}/settled`)
  const { bids, min } = useMemo(() => analyze(bidRaw, players), [bidRaw, players])
  const reveal = meta.roundStatus === 'reveal'
  const pass = itemById('pass')

  const settle = async () => {
    // 탈출자(최저 초과)는 입찰한 패스권 차감. 최저 입찰자는 벌칙 수행(차감 없음).
    for (const b of bids) {
      if (b.amount > min && b.amount > 0) await changeItem(roomId, 'personal', b.id, 'pass', -b.amount)
    }
    dbSet(`${base}/settled`, true)
  }

  return (
    <div className="text-center">
      <div className="text-xl font-black">🎪 미션: {meta.prompt || '(상단에 미션 입력)'}</div>
      <div className="mt-1 text-white/50">
        {bids.length}/{players.length} 입찰 {reveal ? '· 공개됨' : '· 봉인 중'}
      </div>
      {reveal ? (
        <div className="mt-4 max-w-md mx-auto space-y-1.5">
          {bids.map((b) => {
            const loser = b.amount === min
            return (
              <div
                key={b.id}
                className={`flex items-center justify-between rounded-xl px-4 py-2 ${
                  loser ? 'bg-rose-600/30 border border-rose-400' : 'bg-white/5'
                }`}
              >
                <span className="font-bold">
                  {loser && '💀 '}
                  {b.nickname}
                </span>
                <span className="tabular-nums">
                  {pass.emoji} {b.amount} {loser ? '· 벌칙!' : '· 회피'}
                </span>
              </div>
            )
          })}
          {!settled ? (
            <Button className="mt-2 w-full" variant="warn" onClick={settle} disabled={!bids.length}>
              정산 (회피자 패스권 차감)
            </Button>
          ) : (
            <p className="mt-2 text-emerald-400 font-bold">정산 완료 ✅</p>
          )}
        </div>
      ) : (
        <p className="mt-8 text-white/40 text-xl animate-pulse">봉인 입찰 중… ‘공개’를 누르면 결과 표시</p>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const myBid = useValue(`${base}/bid/${me.id}`)
  const owned = me.items?.pass || 0
  const [amount, setAmount] = useState(0)
  const open = meta.roundStatus === 'open'
  const pass = itemById('pass')

  return (
    <div className="text-center">
      <p className="text-white/60">🎪 {meta.prompt || '미션 회피 입찰'}</p>
      <p className="mt-1 text-sm text-white/50">
        보유 {pass.emoji} 패스권 <b>{owned}</b>개 · 많이 걸수록 회피 확률↑ (최저 입찰자가 벌칙)
      </p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          className="w-14 h-14 rounded-full bg-white/10 text-2xl font-black"
          onClick={() => setAmount((a) => Math.max(0, a - 1))}
          disabled={!open}
        >
          −
        </button>
        <div className="text-5xl font-black tabular-nums w-20">{amount}</div>
        <button
          className="w-14 h-14 rounded-full bg-white/10 text-2xl font-black"
          onClick={() => setAmount((a) => Math.min(owned, a + 1))}
          disabled={!open}
        >
          +
        </button>
      </div>
      <Button
        className="mt-4 w-full"
        onClick={() => dbSet(`${base}/bid/${me.id}`, amount)}
        disabled={!open || amount > owned}
      >
        {amount}개 봉인 입찰 {myBid != null && '(수정)'}
      </Button>
      {myBid != null && <p className="mt-2 text-sm text-emerald-400">입찰됨: {myBid}개 (공개 전까지 비밀)</p>}
    </div>
  )
}

export default {
  id: 'auction',
  name: '블라인드 옥션',
  emoji: '🎪',
  tagline: '패스권 봉인 입찰 · 최저가 벌칙',
  promptLabel: '고수위 미션 (예: 진행자와 5초 백허그)',
  HostView,
  PlayerView,
}
