// 게임 상태를 바꾸는 모든 쓰기 동작을 한 곳에 모음.
import {
  roomPath,
  dbSet,
  dbUpdate,
  dbGet,
  dbTransaction,
  dbRemove,
} from './db'
import { DEFAULT_TEAMS, TEAM_COLORS } from '../config/teams'
import { initialItems } from '../config/items'
import { ROSTER } from '../config/roster'

const genRoomId = () => Math.random().toString().slice(2, 8) // 6자리 숫자 방코드

// 기본 팀 시드 (이름·색·순서·점수·재화)
const seedTeams = () =>
  DEFAULT_TEAMS.reduce((acc, t, i) => {
    acc[t.id] = { name: t.name, color: t.color, order: i, score: 0, items: initialItems('team') }
    return acc
  }, {})

// ── 테스트 운영용 고정 방 ────────────────────────
export const SB_ROOM_ID = 'SB'
export const SB_HOST_PIN = '4321'

// 방 문서를 새로 씀 (id 지정)
async function writeNewRoom(roomId, hostPin) {
  const teams = seedTeams()
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

// ── 방 생성 (호스트, 랜덤 코드) ──────────────────
export const createRoom = (hostPin) => writeNewRoom(genRoomId(), hostPin)

// ── 고정 방 확보 (없으면 생성) ───────────────────
export async function ensureFixedRoom(roomId = SB_ROOM_ID, hostPin = SB_HOST_PIN) {
  if (!(await roomExists(roomId))) await writeNewRoom(roomId, hostPin)
  return roomId
}

// ── 명단(ROSTER)을 방에 시드: 팀 배정된 테스트 참가자들 생성 ──
export async function seedRoster(roomId) {
  const updates = {}
  ROSTER.forEach((p, i) => {
    updates[`players/seed${i}`] = {
      nickname: p.name,
      teamId: p.team,
      connected: true,
      seed: true,
      joinedAt: Date.now() + i,
      items: initialItems('personal'),
    }
  })
  await dbUpdate(roomPath(roomId), updates)
}

// ── 테스트 시드 참가자(seed:true)만 제거. 실제 참가자는 유지 ──
export async function clearSeeds(roomId) {
  const players = await dbGet(roomPath(roomId, 'players'))
  if (!players) return 0
  const updates = {}
  Object.entries(players).forEach(([id, p]) => {
    if (p?.seed) updates[`players/${id}`] = null
  })
  const n = Object.keys(updates).length
  if (n) await dbUpdate(roomPath(roomId), updates)
  return n
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

// ── 호스트: 참가자 강퇴 (레코드 삭제 → 그 사람 폰은 자동으로 입장 화면으로, 재입장 가능) ──
export const kickPlayer = (roomId, playerId) =>
  dbRemove(roomPath(roomId, `players/${playerId}`))

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

// ── 팀 편집 (호스트) ─────────────────────────────
export const setTeamName = (roomId, teamId, name) =>
  dbUpdate(roomPath(roomId, `teams/${teamId}`), { name })

export const setTeamColor = (roomId, teamId, color) =>
  dbUpdate(roomPath(roomId, `teams/${teamId}`), { color })

export async function addTeam(roomId) {
  const teams = (await dbGet(roomPath(roomId, 'teams'))) || {}
  const list = Object.values(teams)
  const used = new Set(list.map((t) => t.color))
  const color = TEAM_COLORS.find((c) => !used.has(c)) || TEAM_COLORS[list.length % TEAM_COLORS.length]
  const order = list.length ? Math.max(...list.map((t) => t.order ?? 0)) + 1 : 0
  const id = 't' + Math.random().toString(36).slice(2, 7)
  await dbUpdate(roomPath(roomId), {
    [`teams/${id}`]: { name: `${order + 1}팀`, color, order, score: 0, items: initialItems('team') },
  })
  return id
}

export async function removeTeam(roomId, teamId) {
  const players = (await dbGet(roomPath(roomId, 'players'))) || {}
  const updates = { [`teams/${teamId}`]: null }
  // 그 팀 소속 참가자는 팀 해제 → 다시 선택하게
  Object.entries(players).forEach(([pid, p]) => {
    if (p?.teamId === teamId) updates[`players/${pid}/teamId`] = null
  })
  await dbUpdate(roomPath(roomId), updates)
}

// ── 방 초기화 (참가자·점수·재화·진행상태 리셋. 팀 구성[이름·색·개수]은 유지) ──
export async function resetRoom(roomId) {
  const hostPin = await dbGet(roomPath(roomId, 'meta/hostPin'))
  const existing = (await dbGet(roomPath(roomId, 'teams'))) || {}
  // 이름이 있는 유효한 팀 구성이면 유지, 아니면(구버전/빈 방) 기본팀으로 재시드
  const hasNamed = Object.keys(existing).length && Object.values(existing).every((t) => t?.name)
  let teams
  if (hasNamed) {
    teams = {}
    Object.entries(existing).forEach(([id, t]) => {
      teams[id] = { name: t.name, color: t.color, order: t.order ?? 0, score: 0, items: initialItems('team') }
    })
  } else {
    teams = seedTeams()
  }
  await dbUpdate(roomPath(roomId), {
    players: null, // 모든 참가자 제거
    play: null, // 모든 게임 상호작용 데이터 제거
    teams, // 점수/팀재화 초기화
    meta: {
      hostPin: String(hostPin ?? ''),
      phase: 'lobby',
      activeGameId: null,
      roundStatus: 'staged',
      roundSeq: 0,
      prompt: '',
      createdAt: Date.now(),
    },
  })
}
