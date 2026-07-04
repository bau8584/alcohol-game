// Player: 내 개인 재화 + 팀 공유 재화 (클레이).
import { personalItems, teamItems } from '../config/items'
import { teamById } from '../config/teams'

export default function ItemBar({ me, team }) {
  const pItems = personalItems()
  const tItems = teamItems()
  const t = team || teamById(me?.teamId)
  return (
    <div className="clay p-3 text-sm" style={{ background: 'var(--surface)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span style={{ color: 'var(--ink-soft)' }}>내 쿠폰</span>
        {pItems.map((it) => (
          <span key={it.id} className="clay-inset px-2.5 py-1 font-bold">{it.emoji} {it.name} {me?.items?.[it.id] || 0}</span>
        ))}
      </div>
      {t && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span style={{ color: 'var(--ink-soft)' }}>팀 쿠폰</span>
          {tItems.map((it) => (
            <span key={it.id} className="px-2.5 py-1 rounded-xl font-bold text-white" style={{ background: t.color }}>{it.emoji} {t.items?.[it.id] || 0}</span>
          ))}
        </div>
      )}
    </div>
  )
}
