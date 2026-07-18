// 방 관리 접이식 카드 — 팀 점수(±조절)·참가자 관리·팀 설정을 게임 아래로 내려 접어둔다.
// 접힌 상태에서도 '팀 점수 한 줄 요약'은 항상 보이고, 펼치면 조작 UI가 나온다.
// 게임 전(세팅)엔 펼침, 게임 중엔 접힘이 기본. 처음 하는 사람도 라벨로 찾을 수 있게.
import { useState } from 'react'
import Scoreboard from './Scoreboard'
import PlayerManager from './PlayerManager'
import TeamSettings from './TeamSettings'
import { Card } from './ui'

const MEDALS = ['🥇', '🥈', '🥉']

function CompactScores({ teams }) {
  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const rankOf = (t) => teams.filter((x) => x.score > t.score).length
  return (
    <div className="flex flex-wrap items-center gap-1.5 justify-end">
      {ranked.map((t) => {
        const medal = t.score > 0 ? MEDALS[rankOf(t)] : null
        return (
          <span key={t.id} className="px-2 py-0.5 rounded-lg text-sm font-bold whitespace-nowrap" style={{ background: 'var(--surface-2)' }}>
            {medal && <span className="mr-0.5">{medal}</span>}
            <span style={{ color: t.color }}>{t.name}</span> <span className="tabular-nums">{t.score}</span>
          </span>
        )
      })}
    </div>
  )
}

export default function RoomPanel({ roomId, teams, players, game, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-3">
      <Card>
        <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3">
          <span className="font-display text-lg shrink-0">🔧 팀 점수 · 관리</span>
          {!open && <div className="min-w-0 overflow-x-auto flex-1"><CompactScores teams={teams} /></div>}
          <span className="shrink-0 text-sm" style={{ color: 'var(--ink-soft)' }}>{open ? '▲ 접기' : '▼ 점수주기·참가자·팀'}</span>
        </button>
      </Card>

      {open && (
        <>
          <Scoreboard roomId={roomId} teams={teams} />
          {!game && <TeamSettings roomId={roomId} teams={teams} />}
          <PlayerManager roomId={roomId} players={players} teams={teams} />
        </>
      )}
    </div>
  )
}
