// 호스트 로비: 팀 개수·이름·색(과일 프리셋) 편집. (게임 시작 전에만 노출 권장)
import { setTeamName, setTeamColor, addTeam, removeTeam } from '../lib/actions'
import { TEAM_PALETTE } from '../config/teams'
import { Card } from './ui'

const MAX_TEAMS = 8
const MIN_TEAMS = 2

export default function TeamSettings({ roomId, teams }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl">🎨 팀 설정</h2>
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{teams.length}팀</span>
      </div>

      <div className="space-y-3">
        {teams.map((t) => (
          <div key={t.id} className="clay-inset p-2.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ background: t.color }} />
              <input
                defaultValue={t.name}
                onChange={(e) => setTeamName(roomId, t.id, e.target.value.slice(0, 10))}
                className="flex-1 min-w-0 bg-transparent outline-none font-bold"
                placeholder="팀 이름"
              />
              <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>{t.members.length}명</span>
              <button
                onClick={() => confirm(`'${t.name}' 팀을 삭제할까요? 소속 인원은 팀 미정으로 돌아갑니다.`) && removeTeam(roomId, t.id)}
                disabled={teams.length <= MIN_TEAMS}
                className="clay-btn px-2.5 py-1 text-sm shrink-0 disabled:opacity-40"
                style={{ background: 'var(--c-coral)', color: '#fff' }}
                title="팀 삭제"
              >
                −
              </button>
            </div>
            {/* 과일 색상 프리셋 */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEAM_PALETTE.map((f) => {
                const on = t.color === f.color
                return (
                  <button
                    key={f.color}
                    onClick={() => setTeamColor(roomId, t.id, f.color)}
                    className="w-9 h-9 rounded-xl text-xl flex items-center justify-center transition"
                    style={{ background: f.color, opacity: on ? 1 : 0.5, outline: on ? '3px solid var(--ink)' : 'none' }}
                    title={f.emoji}
                  >
                    {f.emoji}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => addTeam(roomId)}
        disabled={teams.length >= MAX_TEAMS}
        className="clay-btn font-display w-full mt-3 py-2.5 disabled:opacity-40"
        style={{ background: 'var(--c-mint)', color: '#fff' }}
      >
        + 팀 추가
      </button>
    </Card>
  )
}
