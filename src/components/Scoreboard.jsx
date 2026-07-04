// Host 화면 상단: 팀별 점수 + 팀 공유 재화 + 인원수.
import { teamItems } from '../config/items'

export default function Scoreboard({ teams }) {
  const tItems = teamItems()
  const max = Math.max(1, ...teams.map((t) => t.score))
  return (
    <div className="grid grid-cols-3 gap-3">
      {teams.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl p-4 border"
          style={{ borderColor: t.color + '55', background: t.color + '11' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl font-black" style={{ color: t.color }}>
              {t.emoji} {t.name}
            </span>
            <span className="text-sm text-white/60">{t.members.length}명</span>
          </div>
          <div className="mt-1 text-4xl font-black tabular-nums">{t.score}</div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(t.score / max) * 100}%`, background: t.color }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {tItems.map((it) => (
              <span key={it.id} className="text-xs text-white/70">
                {it.emoji}
                {t.items?.[it.id] || 0}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
