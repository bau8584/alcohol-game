// Host 상단: 팀별 점수 + 팀 재화 + 인원수 (클레이).
import { teamItems } from '../config/items'

export default function Scoreboard({ teams }) {
  const tItems = teamItems()
  const max = Math.max(1, ...teams.map((t) => t.score))
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      {teams.map((t) => (
        <div key={t.id} className="clay p-4" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between">
            <span className="font-display text-xl truncate" style={{ color: t.color }}>{t.name}</span>
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{t.members.length}명</span>
          </div>
          <div className="font-display text-4xl mt-1">{t.score}</div>
          <div className="mt-2 h-2.5 clay-inset overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(t.score / max) * 100}%`, background: t.color }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            {tItems.map((it) => (<span key={it.id}>{it.emoji}{t.items?.[it.id] || 0}</span>))}
          </div>
        </div>
      ))}
    </div>
  )
}
