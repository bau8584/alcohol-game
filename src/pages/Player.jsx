import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { joinRoom, setPlayerTeam, playBase } from '../lib/actions'
import { ensurePlayerId, getSession, saveSession } from '../lib/session'
import { markPresence, roomPath } from '../lib/db'
import { TEAMS } from '../config/teams'
import ItemBar from '../components/ItemBar'
import { Button, Card, PhaseTag } from '../components/ui'

export default function Player() {
  const { roomId } = useParams()
  const [playerId] = useState(ensurePlayerId)
  const { loading, exists, meta, players, teams } = useRoom(roomId)
  const [nick, setNick] = useState(getSession().nickname || '')

  const me = players.find((p) => p.id === playerId)
  const myTeam = teams.find((t) => t.id === me?.teamId)

  // 접속 상태 표시 + 끊김 감지
  useEffect(() => {
    if (me) markPresence(roomPath(roomId, `players/${playerId}/connected`), true, false)
  }, [!!me, roomId, playerId])

  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>방 코드 {roomId} 를 찾을 수 없어요.</Center>

  // 1) 닉네임 입장
  if (!me) {
    const submit = async () => {
      const n = nick.trim()
      if (!n) return
      saveSession({ nickname: n, roomId })
      await joinRoom(roomId, playerId, n)
    }
    return (
      <Center>
        <Card className="w-full max-w-sm text-center">
          <div className="text-3xl mb-1">🍻</div>
          <h2 className="text-xl font-black mb-3">방 {roomId} 입장</h2>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value.slice(0, 12))}
            placeholder="닉네임"
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none mb-3 text-center text-lg"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button className="w-full" onClick={submit}>
            입장
          </Button>
        </Card>
      </Center>
    )
  }

  // 2) 팀 선택
  if (!me.teamId) {
    return (
      <Center>
        <Card className="w-full max-w-sm text-center">
          <h2 className="text-xl font-black mb-1">{me.nickname} 님, 팀을 선택하세요</h2>
          <p className="text-sm text-white/50 mb-4">중간에 진행자가 조정할 수 있어요.</p>
          <div className="grid gap-2">
            {TEAMS.map((t) => {
              const count = teams.find((x) => x.id === t.id)?.members.length || 0
              return (
                <button
                  key={t.id}
                  onClick={() => setPlayerTeam(roomId, playerId, t.id)}
                  className="rounded-xl px-4 py-4 font-black text-lg border-2 transition active:scale-95"
                  style={{ borderColor: t.color, background: t.color + '18', color: t.color }}
                >
                  {t.emoji} {t.name} <span className="text-sm text-white/50">({count}명)</span>
                </button>
              )
            })}
          </div>
        </Card>
      </Center>
    )
  }

  // 3) 게임 플레이
  const game = meta.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null

  return (
    <div className="min-h-full p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-black">
          {me.nickname}{' '}
          <span className="text-sm font-normal" style={{ color: myTeam?.color }}>
            {myTeam?.emoji} {myTeam?.name}
          </span>
        </div>
        {game && <PhaseTag status={meta.roundStatus} />}
      </div>

      <ItemBar me={me} team={myTeam} />

      <div className="pt-2">
        {game && base ? (
          <game.PlayerView
            roomId={roomId}
            base={base}
            meta={meta}
            players={players}
            teams={teams}
            me={me}
            myTeam={myTeam}
          />
        ) : (
          <div className="text-center py-16 text-white/50">
            <div className="text-5xl mb-3 animate-pulse">⏳</div>
            진행자가 게임을 고르는 중…
            <div className="mt-1 text-sm">메인 스크린을 봐주세요!</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center p-6 text-white/60">{children}</div>
}
