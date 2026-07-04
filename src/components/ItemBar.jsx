// Player 화면: 내 개인 재화 + 우리 팀 공유 재화 표시.
import { personalItems, teamItems } from '../config/items'
import { teamById } from '../config/teams'

export default function ItemBar({ me, team }) {
  const pItems = personalItems()
  const tItems = teamItems()
  const t = team || teamById(me?.teamId)
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white/50">내 쿠폰</span>
        {pItems.map((it) => (
          <span key={it.id} className="rounded-lg bg-white/10 px-2 py-1 font-bold">
            {it.emoji} {it.name} <span className="tabular-nums">{me?.items?.[it.id] || 0}</span>
          </span>
        ))}
      </div>
      {t && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
          <span className="text-white/50">팀 쿠폰</span>
          {tItems.map((it) => (
            <span
              key={it.id}
              className="rounded-lg px-2 py-1 font-bold"
              style={{ background: t.color + '22', color: t.color }}
            >
              {it.emoji} {it.name} <span className="tabular-nums">{t.items?.[it.id] || 0}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
