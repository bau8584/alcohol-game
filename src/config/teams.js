// 팀은 방 데이터(rooms/{id}/teams)로 관리되며 호스트가 개수·이름·색을 편집한다.
// 아래는 방 생성 시 기본값 + 새 팀 추가용 색 팔레트. (이모지 없음)
// 기본 id(board/ins/ski)는 roster 시드 매핑과 호환되도록 유지.
// 과일 색상 프리셋 (이모지 = 색 스와치)
export const TEAM_PALETTE = [
  { emoji: '🍎', color: '#ef4444' }, // 사과
  { emoji: '🍊', color: '#f97316' }, // 귤
  { emoji: '🍋', color: '#eab308' }, // 레몬
  { emoji: '🍏', color: '#84cc16' }, // 청사과
  { emoji: '🥝', color: '#22c55e' }, // 키위
  { emoji: '🫐', color: '#3b82f6' }, // 블루베리
  { emoji: '🍇', color: '#8b5cf6' }, // 포도
  { emoji: '🍑', color: '#fb7185' }, // 복숭아
  { emoji: '🍓', color: '#f43f5e' }, // 딸기
  { emoji: '🍈', color: '#14b8a6' }, // 멜론
]

export const TEAM_COLORS = TEAM_PALETTE.map((f) => f.color)

export const DEFAULT_TEAMS = [
  { id: 'board', name: '보드', color: '#3b82f6' }, // 🫐
  { id: 'ins', name: '인스', color: '#fb7185' }, // 🍑
  { id: 'ski', name: '스키', color: '#22c55e' }, // 🥝
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
