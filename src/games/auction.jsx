// ⑤ 옥션 — 패스권 봉인 입찰, 최저 입찰자가 벌칙.
import { useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { changeItem } from '../lib/actions'
import { Button } from '../components/ui'
import { itemById } from '../config/items'

function HostView({ roomId, base, meta, players }) {
  const bidRaw = useValue(`${base}/bid`)
  const settled = useValue(`${base}/settled`)
  const { bids, min } = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const b = toList(bidRaw).map((x) => ({ id: x.id, amount: x.value ?? 0, nickname: byId[x.id]?.nickname || x.id })).sort((p, q) => p.amount - q.amount)
    return { bids: b, min: b.length ? b[0].amount : 0 }
  }, [bidRaw, players])
  const reveal = meta.roundStatus === 'reveal'
  const pass = itemById('pass')
  const settle = async () => {
    for (const b of bids) if (b.amount > min && b.amount > 0) await changeItem(roomId, 'personal', b.id, 'pass', -b.amount)
    dbSet(`${base}/settled`, true)
  }
  return (
    <div className="text-center">
      <div className="font-display text-xl">🎪 {meta.prompt || '(상단에 미션 입력)'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{bids.length}/{players.length} 입찰 {reveal ? '· 공개' : '· 봉인'}</div>
      {reveal ? (
        <div className="mt-4 max-w-sm mx-auto space-y-1.5">
          {bids.map((b) => {
            const loser = b.amount === min
            return (
              <div key={b.id} className="clay flex items-center justify-between px-4 py-2" style={{ background: loser ? 'var(--c-coral)' : 'var(--surface)', color: loser ? '#fff' : 'var(--ink)' }}>
                <span className="font-bold">{loser && '💀 '}{b.nickname}</span>
                <span>{pass.emoji} {b.amount} {loser ? '· 벌칙!' : '· 회피'}</span>
              </div>
            )
          })}
          {!settled ? <Button className="mt-2 w-full" variant="warn" onClick={settle} disabled={!bids.length}>정산 (회피자 패스권 차감)</Button> : <p className="mt-2 font-bold" style={{ color: 'var(--c-mint)' }}>정산 완료 ✅</p>}
        </div>
      ) : <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>봉인 입찰 중…</p>}
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
      <p style={{ color: 'var(--ink-soft)' }}>🎪 {meta.prompt || '미션 회피 입찰'}</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>보유 {pass.emoji} <b>{owned}</b>개 · 최저 입찰자가 벌칙</p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button className="w-14 h-14 rounded-full clay-btn text-2xl" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }} onClick={() => setAmount((a) => Math.max(0, a - 1))} disabled={!open}>−</button>
        <div className="font-display text-5xl w-20">{amount}</div>
        <button className="w-14 h-14 rounded-full clay-btn text-2xl" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }} onClick={() => setAmount((a) => Math.min(owned, a + 1))} disabled={!open}>+</button>
      </div>
      <Button className="mt-4 w-full" onClick={() => dbSet(`${base}/bid/${me.id}`, amount)} disabled={!open || amount > owned}>{amount}개 봉인 입찰 {myBid != null && '(수정)'}</Button>
      {myBid != null && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>입찰됨: {myBid}개 (비밀)</p>}
    </div>
  )
}

export default {
  id: 'auction',
  name: '블라인드 옥션',
  emoji: '🎪',
  tagline: '패스권 봉인 입찰',
  promptLabel: '고수위 미션 (예: 진행자와 5초 백허그)',
  HostView,
  PlayerView,
}
