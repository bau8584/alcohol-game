// 게임 상태를 바꾸는 모든 쓰기 동작을 한 곳에 모음.
import {
  roomPath,
  dbSet,
  dbUpdate,
  dbGet,
  dbTransaction,
  dbRemove,
} from './db'
import { TEAMS } from '../config/teams'
import { initialItems } from '../config/items'

const genRoomId = () => Math.random().toString().slice(2, 8) // 6자리 숫자 방코드

// ── 방 생성 (호스트) ─────────────────────────────
export async function createRoom(hostPin) {
  const roomId = genRoomId()
  const teams = TEAMS.reduce((acc, t) => {
    acc[t.id] = { score: 0, items: initialItems('team') }
    return acc
  }, {})
  await dbSet(roomPath(roomId), {
    meta: {
      hostPin: String(hostPin || ''),
      phase: 'lobby', // lobby | playing
      activeGameId: null,
      roundStatus: 'staged', // staged | open | reveal
      roundSeq: 0,
      prompt: '',
      createdAt: Date.now(),
    },
    teams,
  })
  return roomId
}

export async function roomExists(roomId) {
  return !!(await dbGet(roomPath(roomId, 'meta')))
}

export async function checkHostPin(roomId, pin) {
  const real = await dbGet(roomPath(roomId, 'meta/hostPin'))
  return String(real) === String(pin)
}

// ── 참가자 입장 / 팀 선택 ────────────────────────
export async function joinRoom(roomId, playerId, nickname) {
  const p = roomPath(roomId, `players/${playerId}`)
  const existing = await dbGet(p)
  await dbUpdate(p, {
    nickname,
    joinedAt: existing?.joinedAt || Date.now(),
    connected: true,
    teamId: existing?.teamId || null,
    items: existing?.items || initialItems('personal'),
  })
}

export const setPlayerTeam = (roomId, playerId, teamId) =>
  dbUpdate(roomPath(roomId, `players/${playerId}`), { teamId })

export const setConnected = (roomId, playerId, v) =>
  dbUpdate(roomPath(roomId, `players/${playerId}`), { connected: v })

// ── 호스트: 게임/라운드 제어 ─────────────────────
export async function startGame(roomId, gameId) {
  const seq = (await dbGet(roomPath(roomId, 'meta/roundSeq'))) || 0
  await dbUpdate(roomPath(roomId, 'meta'), {
    phase: 'playing',
    activeGameId: gameId,
    roundStatus: 'staged',
    roundSeq: seq + 1,
    prompt: '',
  })
}

export const setRoundStatus = (roomId, status) =>
  dbUpdate(roomPath(roomId, 'meta'), { roundStatus: status })

export const setPrompt = (roomId, prompt) =>
  dbUpdate(roomPath(roomId, 'meta'), { prompt })

export async function newRound(roomId) {
  // 같은 게임 유지, 상호작용 버킷만 새로 (roundSeq++ 로 자동 격리)
  const seq = (await dbGet(roomPath(roomId, 'meta/roundSeq'))) || 0
  await dbUpdate(roomPath(roomId, 'meta'), { roundSeq: seq + 1, roundStatus: 'staged', prompt: '' })
}

export const endGame = (roomId) =>
  dbUpdate(roomPath(roomId, 'meta'), { phase: 'lobby', activeGameId: null, roundStatus: 'staged' })

// ── 호스트: 점수 / 재화 정산 ─────────────────────
export const addTeamScore = (roomId, teamId, delta) =>
  dbTransaction(roomPath(roomId, `teams/${teamId}/score`), (cur) => (cur || 0) + delta)

// scope: 'personal' → ownerId = playerId,  'team' → ownerId = teamId
export function changeItem(roomId, scope, ownerId, itemId, delta) {
  const base = scope === 'team' ? `teams/${ownerId}` : `players/${ownerId}`
  return dbTransaction(roomPath(roomId, `${base}/items/${itemId}`), (cur) =>
    Math.max(0, (cur || 0) + delta)
  )
}

// ── 게임 상호작용 데이터 경로 (roundSeq + gameId 로 격리) ──
export const playBase = (roomId, roundSeq, gameId) =>
  roomPath(roomId, `play/${roundSeq}/${gameId}`)

// 방 전체 삭제 (호스트 종료)
export const destroyRoom = (roomId) => dbRemove(roomPath(roomId))
