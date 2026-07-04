// Host 정산: 팀 점수 가감 + 개인/팀 쿠폰 지급·차감 (클레이).
import { useState } from 'react'
import { addTeamScore, changeItem } from '../lib/actions'
import { personalItems, teamItems } from '../config/items'
import { Card } from './ui'

export default function AwardPanel({ roomId, players, teams }) {
  const [scope, setScope] = useState('personal')
  const [ownerId, setOwnerId] = useState('')
  const [itemId, setItemId] = useState(personalItems()[0]?.id || '')
  const owners = scope === 'team' ? teams : players
  const items = scope === 'team' ? teamItems() : personalItems()
  const sel = 'clay-inset px-3 py-2 text-sm bg-[var(--surface-2)]'

  const give = (delta) => {
    const oid = ownerId || owners[0]?.id
    const iid = itemId || items[0]?.id
    if (oid && iid) changeItem(roomId, scope, oid, iid, delta)
  }

  return (
    <Card className="space-y-3">
      <div>
        <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>팀 점수</div>
        <div className="grid grid-cols-3 gap-2">
          {teams.map((t) => (
            <div key={t.id} className="clay-inset p-2 text-center">
              <div className="font-display text-sm" style={{ color: t.color }}>{t.emoji} {t.name} · {t.score}</div>
              <div className="mt-1 flex justify-center gap-1">
                {[-1, 1, 5].map((d) => (
                  <button key={d} onClick={() => addTeamScore(roomId, t.id, d)} className="clay-btn px-2 py-1 text-xs" style={{ background: d > 0 ? 'var(--c-mint)' : 'var(--c-coral)' }}>{d > 0 ? `+${d}` : d}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>쿠폰 지급 / 차감</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={scope} onChange={(e) => { setScope(e.target.value); setOwnerId(''); setItemId('') }} className={sel}>
            <option value="personal">개인</option>
            <option value="team">팀</option>
          </select>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={`${sel} max-w-[38%]`}>
            {owners.map((o) => (<option key={o.id} value={o.id}>{o.nickname || o.name}</option>))}
          </select>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={sel}>
            {items.map((i) => (<option key={i.id} value={i.id}>{i.emoji} {i.name}</option>))}
          </select>
          <button onClick={() => give(1)} className="clay-btn px-3 py-2 text-sm" style={{ background: 'var(--c-mint)' }}>+1</button>
          <button onClick={() => give(-1)} className="clay-btn px-3 py-2 text-sm" style={{ background: 'var(--c-coral)' }}>−1</button>
        </div>
      </div>
    </Card>
  )
}
