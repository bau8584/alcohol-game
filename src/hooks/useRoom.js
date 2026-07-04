// 방의 meta/players/teams 를 한 번에 구독해 정규화된 컨텍스트로 제공.
import { useMemo } from 'react'
import { useValue, roomPath, toList } from '../lib/db'
import { TEAMS, teamById } from '../config/teams'

export function useRoom(roomId) {
  const meta = useValue(roomId ? roomPath(roomId, 'meta') : null)
  const playersRaw = useValue(roomId ? roomPath(roomId, 'players') : null)
  const teamsRaw = useValue(roomId ? roomPath(roomId, 'teams') : null)

  const players = useMemo(() => toList(playersRaw), [playersRaw])

  const teams = useMemo(
    () =>
      TEAMS.map((t) => ({
        ...t,
        score: teamsRaw?.[t.id]?.score || 0,
        items: teamsRaw?.[t.id]?.items || {},
        members: players.filter((p) => p.teamId === t.id),
      })),
    [teamsRaw, players]
  )

  return {
    loading: meta === undefined,
    exists: !!meta,
    meta: meta || null,
    players,
    teams,
    teamById,
  }
}
