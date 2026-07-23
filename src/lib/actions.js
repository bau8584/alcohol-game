// 게임 상태를 바꾸는 모든 쓰기 동작을 한 곳에 모음.
import {
  roomPath,
  dbSet,
  dbUpdate,
  dbGet,
  dbTransaction,
  dbRemove,
  dbPush,
  SERVER_TS,
} from './db'
import { DEFAULT_TEAMS, TEAM_COLORS, TEAM_PALETTE } from '../config/teams'
import { initialItems } from '../config/items'
import { ROSTER } from '../config/roster'

const genRoomId = () => String(Math.floor(100000 + Math.random() * 900000)) // 6자리 숫자 방코드(앞자리 0 없음)
const genHostPin = () => String(Math.floor(1000 + Math.random() * 9000)) // 4자리 호스트 PIN

// 기본 팀 시드 (이름·색·순서·점수·재화)
const seedTeams = () =>
  DEFAULT_TEAMS.reduce((acc, t, i) => {
    acc[t.id] = { name: t.name, color: t.color, order: i, score: 0, items: initialItems('team') }
    return acc
  }, {})

// 하트: 방 전역 재화. 입장 시 기본 지급, 밤 마지막 '하트 시그널'에서 마음에 드는 사람에게 보냄.
export const BASE_HEARTS = 3

// ── 테스트 운영용 고정 방 ────────────────────────
export const SB_ROOM_ID = 'SB'
export const SB_HOST_PIN = '4321'
// 개발용 시드(명단 29명)를 붓는 별도 테스트 방. 실전 SB 방 오염 방지용.
export const SB_TEST_ROOM_ID = 'SBTEST'

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

// ── 방 생성 (호스트, 랜덤 코드 + PIN 자동 발급) ───
// 6자리 방코드와 4자리 호스트 PIN을 새로 뽑아 방을 만들고 { roomId, hostPin } 반환.
// 방코드가 이미 있으면(희박) 몇 번 다시 뽑아 기존 방 덮어쓰기를 피한다.
export async function createRoom() {
  let roomId = genRoomId()
  for (let i = 0; i < 8 && (await roomExists(roomId)); i++) roomId = genRoomId()
  const hostPin = genHostPin()
  await writeNewRoom(roomId, hostPin)
  return { roomId, hostPin }
}

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

// ── 진행자도 참가자 모드 ────────────────────────
// 참가자가 자기 폰에서 PIN을 넣어 '진행자'가 된다 → meta.hostPlayerId = 그 사람.
// 마지막에 claim 한 사람이 진행자(= 진행자 이양). PIN이 틀리면 false.
export async function claimHost(roomId, playerId, pin) {
  if (!(await checkHostPin(roomId, pin))) return false
  await dbUpdate(roomPath(roomId, 'meta'), { hostPlayerId: playerId })
  return true
}

// 진행자 권한 내려놓기 (본인일 때만)
export async function releaseHost(roomId, playerId) {
  const cur = await dbGet(roomPath(roomId, 'meta/hostPlayerId'))
  if (cur !== playerId) return false
  await dbUpdate(roomPath(roomId, 'meta'), { hostPlayerId: null })
  return true
}

// 닉네임 비교용 정규화: 앞뒤·중간 공백 제거 + 소문자 (표시는 원본 유지)
const nickKey = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

// 방 안에서 이미 쓰이는 닉네임인지 (본인 제외). 한 사람이 여러 닉으로 중복 입장하는 걸 막음.
export async function isNicknameTaken(roomId, playerId, nickname) {
  const players = await dbGet(roomPath(roomId, 'players'))
  const key = nickKey(nickname)
  return Object.entries(players || {}).some(
    ([id, p]) => id !== playerId && p && nickKey(p.nickname) === key
  )
}

// 닉네임을 점유 중인 다른 참가자의 id (없으면 null). DUP 안내/이어받기에 사용.
export async function nicknameHolder(roomId, playerId, nickname) {
  const players = await dbGet(roomPath(roomId, 'players'))
  const key = nickKey(nickname)
  const hit = Object.entries(players || {}).find(
    ([id, p]) => id !== playerId && p && nickKey(p.nickname) === key
  )
  return hit ? hit[0] : null
}

// 해당 참가자가 '지금 접속 끊긴(유령)' 상태인지 — presence(실시간)로 판정. true=오프라인 유령.
export async function isPlayerOffline(roomId, playerId) {
  const online = await dbGet(roomPath(roomId, `presence/${playerId}`))
  return online !== true
}

// 오프라인 유령 기록을 이어받기: 그 기록의 닉/연결만 되살린다.
// (호출측에서 세션 playerId=ghostId 로 바꾸고 새로고침 → 그 기록이 곧 '나'가 됨. 점수·팀 유지)
export async function reclaimRecord(roomId, ghostId, nickname) {
  await dbUpdate(roomPath(roomId, `players/${ghostId}`), {
    connected: true,
    nickname: (nickname || '').trim(),
  })
}

// ── 참가자 입장 / 팀 선택 ────────────────────────
// players 노드 트랜잭션으로 닉네임 중복을 원자적으로 차단. 중복이면 committed=false → 에러 throw.
export async function joinRoom(roomId, playerId, nickname) {
  const name = (nickname || '').trim()
  const key = nickKey(name)
  const res = await dbTransaction(roomPath(roomId, 'players'), (players) => {
    players = players || {}
    const taken = Object.entries(players).some(
      ([id, p]) => id !== playerId && p && nickKey(p.nickname) === key
    )
    if (taken) return // 트랜잭션 취소 → committed:false
    const existing = players[playerId]
    players[playerId] = {
      ...(existing || {}),
      nickname: name,
      joinedAt: existing?.joinedAt || Date.now(),
      connected: true,
      teamId: existing?.teamId ?? null,
      items: existing?.items || initialItems('personal'),
      hearts: existing?.hearts ?? BASE_HEARTS, // 전역 하트 재화 기본 지급
    }
    return players
  })
  if (!res.committed) {
    const err = new Error('이미 사용 중인 닉네임이에요.')
    err.code = 'DUP_NICK'
    err.holderId = await nicknameHolder(roomId, playerId, name) // 이어받기 판단용
    throw err
  }
}

export const setPlayerTeam = (roomId, playerId, teamId) =>
  dbUpdate(roomPath(roomId, `players/${playerId}`), { teamId })

// 개발용 테스트 참가자로 표시 → clearSeeds/초기화가 함께 제거 (예: '테스터')
export const markPlayerSeed = (roomId, playerId) =>
  dbUpdate(roomPath(roomId, `players/${playerId}`), { seed: true })

// ── 호스트: 참가자 닉네임 변경 (중복 차단, players 트랜잭션) ──
export async function setPlayerNickname(roomId, playerId, nickname) {
  const name = (nickname || '').trim()
  if (!name) throw new Error('닉네임을 입력하세요.')
  const key = nickKey(name)
  const res = await dbTransaction(roomPath(roomId, 'players'), (players) => {
    players = players || {}
    if (!players[playerId]) return players // 없는 참가자는 그대로
    const taken = Object.entries(players).some(
      ([id, p]) => id !== playerId && p && nickKey(p.nickname) === key
    )
    if (taken) return // 중복 → 트랜잭션 취소
    players[playerId] = { ...players[playerId], nickname: name }
    return players
  })
  if (!res.committed) throw new Error('이미 쓰는 닉네임이에요.')
}

// ── 호스트: 참가자 강퇴 (레코드 삭제 → 그 사람 폰은 자동으로 입장 화면으로, 재입장 가능) ──
export const kickPlayer = (roomId, playerId) =>
  dbRemove(roomPath(roomId, `players/${playerId}`))

// ── 참가자: 스스로 방에서 나가기 (내 레코드 삭제). 세션(localStorage) 정리는 호출측에서. ──
export const leaveRoom = (roomId, playerId) =>
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

// ── 질문 풀(로비): 참가자들이 대기 중 미리 적어두는 공용 질문 목록. 방 전역·지속. ──
// 프롬프트 게임(진선미·군중심리·후던잇 등)에서 '📥 참가자 질문'으로 뽑아 재활용.
export const addQuestion = (roomId, text, by, byId) =>
  dbPush(roomPath(roomId, 'qpool'), { text: String(text).slice(0, 120), by: by || '익명', byId: byId || null, at: SERVER_TS })

export const removeQuestion = (roomId, key) =>
  dbRemove(roomPath(roomId, `qpool/${key}`))

export const clearQpool = (roomId) =>
  dbRemove(roomPath(roomId, 'qpool'))

// ── 호스트: 19금(성인) 콘텐츠 허용 토글. 기본 OFF(방 생성/초기화 시 미설정=off) ──
export const setAdultEnabled = (roomId, v) =>
  dbUpdate(roomPath(roomId, 'meta'), { adultEnabled: !!v })

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

// 하트 지급/차감 (전역 재화, 0 미만 방지)
export const awardHearts = (roomId, playerId, delta) =>
  dbTransaction(roomPath(roomId, `players/${playerId}/hearts`), (cur) => Math.max(0, (cur ?? 0) + delta))

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
  // 안 쓴 과일을 팔레트 순서대로 골라 이름·색을 함께 배정. 다 쓰면 'N팀'으로 폴백.
  const fruit = TEAM_PALETTE.find((f) => !used.has(f.color))
  const order = list.length ? Math.max(...list.map((t) => t.order ?? 0)) + 1 : 0
  const id = 't' + Math.random().toString(36).slice(2, 7)
  const name = fruit ? fruit.name : `${order + 1}팀`
  const color = fruit ? fruit.color : TEAM_COLORS[list.length % TEAM_COLORS.length]
  await dbUpdate(roomPath(roomId), {
    [`teams/${id}`]: { name, color, order, score: 0, items: initialItems('team') },
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
