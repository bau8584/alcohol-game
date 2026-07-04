// Host 상단: 팀별 점수 박스 — 순위 메달 + 점수 ± 조절 + 인원/재화 (클레이).
import { addTeamScore } from '../lib/actions'
import { teamItems } from '../config/items'

const MEDALS = ['🥇', '🥈', '🥉']
const STEPS = [-1, 1, 3, 5]

export default function Scoreboard({ roomId, teams }) {
  const tItems = teamItems()
  const max = Math.max(1, ...teams.map((t) => t.score))
  // 동점 공동순위: 나보다 점수 높은 팀 수 = 내 순위 인덱스
  const rankOf = (t) => teams.filter((x) => x.score > t.score).length

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
      {teams.map((t) => {
        const medal = t.score > 0 ? MEDALS[rankOf(t)] : null
        return (
          <div key={t.id} className="clay p-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between gap-1">
              <span className="font-display text-xl truncate" style={{ color: t.color }}>
                {medal && <span className="mr-1">{medal}</span>}{t.name}
              </span>
              <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>{t.members.length}명</span>
            </div>
            <div className="font-display text-4xl mt-1 tabular-nums">{t.score}</div>
            <div className="mt-2 h-2.5 clay-inset overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(t.score / max) * 100}%`, background: t.color }} />
            </div>

            {roomId && (
              <div className="mt-3 flex items-center gap-1.5">
                {STEPS.map((d) => (
                  <button
                    key={d}
                    onClick={() => addTeamScore(roomId, t.id, d)}
                    className="clay-btn flex-1 py-1.5 text-sm font-display"
                    style={{ background: d > 0 ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            )}

            {tItems.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs justify-center" style={{ color: 'var(--ink-soft)' }}>
                {tItems.map((it) => (<span key={it.id}>{it.emoji}{t.items?.[it.id] || 0}</span>))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
