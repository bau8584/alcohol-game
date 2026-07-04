// Host 정산: 개인 쿠폰(패스권) 지급·차감 (클레이). 팀 점수는 상단 Scoreboard에서 조절.
import { useState } from 'react'
import { changeItem } from '../lib/actions'
import { personalItems } from '../config/items'
import { Card } from './ui'

export default function AwardPanel({ roomId, players }) {
  const [ownerId, setOwnerId] = useState('')
  const pass = personalItems()[0] // 패스권 (유일한 쿠폰)
  const sel = 'clay-inset px-3 py-2 text-sm bg-[var(--surface-2)]'

  const give = (delta) => {
    const oid = ownerId || players[0]?.id
    if (oid && pass) changeItem(roomId, 'personal', oid, pass.id, delta)
  }

  return (
    <Card className="space-y-3">
      {pass && (
        <div>
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>{pass.emoji} {pass.name} 지급 / 차감 <span className="opacity-70">· {pass.desc}</span></div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={`${sel} max-w-[50%]`}>
              {players.map((o) => (<option key={o.id} value={o.id}>{o.nickname}</option>))}
            </select>
            <button onClick={() => give(1)} className="clay-btn px-3 py-2 text-sm" style={{ background: 'var(--c-mint)' }}>+1</button>
            <button onClick={() => give(-1)} className="clay-btn px-3 py-2 text-sm" style={{ background: 'var(--c-coral)' }}>−1</button>
          </div>
        </div>
      )}
    </Card>
  )
}
