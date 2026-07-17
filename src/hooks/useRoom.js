// 방의 meta/players/teams 를 한 번에 구독해 정규화된 컨텍스트로 제공.
import { useEffect, useMemo } from 'react'
import { useValue, roomPath, toList } from '../lib/db'
import { DEFAULT_TEAMS, teamById, setTeamsCache } from '../config/teams'

export function useRoom(roomId) {
  const meta = useValue(roomId ? roomPath(roomId, 'meta') : null)
  const playersRaw = useValue(roomId ? roomPath(roomId, 'players') : null)
  const teamsRaw = useValue(roomId ? roomPath(roomId, 'teams') : null)
  // 접속상태는 players 와 분리된 presence 노드에서 (접속 깜빡임이 players 맵 전체를 재전송하지 않도록)
  const presenceRaw = useValue(roomId ? roomPath(roomId, 'presence') : null)

  const players = useMemo(
    () => toList(playersRaw).map((p) => ({ ...p, connected: presenceRaw?.[p.id] !== false })),
    [playersRaw, presenceRaw]
  )

  // 팀은 방 데이터에서 동적으로. 없으면 기본팀으로 폴백.
  const teams = useMemo(() => {
    const base = teamsRaw
      ? Object.entries(teamsRaw).map(([id, t]) => ({
          id,
          name: t?.name || id,
          color: t?.color || '#94a3b8',
          order: t?.order ?? 0,
          score: t?.score || 0,
          items: t?.items || {},
        }))
      : DEFAULT_TEAMS.map((t, i) => ({ ...t, order: i, score: 0, items: {} }))
    return base
      .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
      .map((t) => ({ ...t, members: players.filter((p) => p.teamId === t.id) }))
  }, [teamsRaw, players])

  // TeamBadge/ItemBar 등이 프롭 없이 조회할 수 있도록 캐시 갱신
  useEffect(() => {
    setTeamsCache(teams)
  }, [teams])

  return {
    loading: meta === undefined,
    exists: !!meta,
    meta: meta || null,
    players,
    teams,
    teamById,
  }
}
