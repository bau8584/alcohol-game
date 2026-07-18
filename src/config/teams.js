// 팀은 방 데이터(rooms/{id}/teams)로 관리되며 호스트가 개수·이름·색을 편집한다.
// 아래는 방 생성 시 기본값 + 새 팀 추가용 과일 팔레트.
// 팀 추가(addTeam) 시 안 쓴 과일을 순서대로 골라 '이름=과일명, 색=과일색'으로 만든다.
// 과일 프리셋 (id·이름·이모지·색) — 이모지는 색 스와치로도 쓰임.
// 붉은 계열(사과·복숭아)은 딸기와 겹쳐서 뺐다. 무지개 순서 8색이라 팀 8개까지 색이 확실히 구분됨.
export const TEAM_PALETTE = [
  { id: 'strawberry', name: '딸기', emoji: '🍓', color: '#f43f5e' },
  { id: 'tangerine', name: '귤', emoji: '🍊', color: '#f97316' },
  { id: 'lemon', name: '레몬', emoji: '🍋', color: '#eab308' },
  { id: 'greenapple', name: '청사과', emoji: '🍏', color: '#84cc16' },
  { id: 'kiwi', name: '키위', emoji: '🥝', color: '#22c55e' },
  { id: 'melon', name: '멜론', emoji: '🍈', color: '#14b8a6' },
  { id: 'blueberry', name: '블루베리', emoji: '🫐', color: '#3b82f6' },
  { id: 'grape', name: '포도', emoji: '🍇', color: '#8b5cf6' },
]

export const TEAM_COLORS = TEAM_PALETTE.map((f) => f.color)

// 기본 2팀: 🍓 딸기 + 🍇 포도. id는 roster 시드(config/roster.js)와 맞춰야 함.
export const DEFAULT_TEAMS = [
  { id: 'strawberry', name: '딸기', color: '#f43f5e' }, // 🍓
  { id: 'grape', name: '포도', color: '#8b5cf6' }, // 🍇
]

// 하위호환: 예전 코드가 TEAMS 를 import 하던 경우
export const TEAMS = DEFAULT_TEAMS

// ── 전역 팀 캐시 ──────────────────────────────
// useRoom 이 현재 방의 팀 목록으로 갱신 → teamById 가 프롭 없이 조회 가능(TeamBadge 등).
let _teams = DEFAULT_TEAMS
export const setTeamsCache = (list) => {
  if (list && list.length) _teams = list
}
export const teamById = (id) => _teams.find((t) => t.id === id) || null
