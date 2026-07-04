// Host 정산 패널: 팀 점수 가감 + 개인/팀 쿠폰 지급·차감.
import { useState } from 'react'
import { addTeamScore, changeItem } from '../lib/actions'
import { ITEMS, personalItems, teamItems } from '../config/items'
import { Card } from './ui'

export default function AwardPanel({ roomId, players, teams }) {
  const [scope, setScope] = useState('personal')
  const [ownerId, setOwnerId] = useState('')
  const [itemId, setItemId] = useState(personalItems()[0]?.id || '')

  const owners = scope === 'team' ? teams : players
  const items = scope === 'team' ? teamItems() : personalItems()

  const give = (delta) => {
    const oid = ownerId || owners[0]?.id
    const iid = itemId || items[0]?.id
    if (!oid || !iid) return
    changeItem(roomId, scope, oid, iid, delta)
  }

  return (
    <Card className="space-y-3">
      <div>
        <div className="text-sm text-white/50 mb-1">팀 점수</div>
        <div className="grid grid-cols-3 gap-2">
          {teams.map((t) => (
            <div key={t.id} className="rounded-xl bg-white/5 p-2 text-center">
              <div className="font-bold text-sm" style={{ color: t.color }}>
                {t.emoji} {t.name} · {t.score}
              </div>
              <div className="mt-1 flex justify-center gap-1">
                {[-1, 1, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => addTeamScore(roomId, t.id, d)}
                    className="rounded bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="text-sm text-white/50 mb-1">쿠폰 지급 / 차감</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value)
              setOwnerId('')
              setItemId('')
            }}
            className="rounded-lg bg-white/10 px-2 py-2 text-sm"
          >
            <option value="personal">개인</option>
            <option value="team">팀</option>
          </select>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="rounded-lg bg-white/10 px-2 py-2 text-sm max-w-[40%]"
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nickname || o.name}
              </option>
            ))}
          </select>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="rounded-lg bg-white/10 px-2 py-2 text-sm"
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.emoji} {i.name}
              </option>
            ))}
          </select>
          <button onClick={() => give(1)} className="rounded-lg bg-emerald-500 text-black px-3 py-2 text-sm font-bold">
            +1 지급
          </button>
          <button onClick={() => give(-1)} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold">
            −1 차감
          </button>
        </div>
      </div>
    </Card>
  )
}
