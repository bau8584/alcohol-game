// 재화(쿠폰) 정의.
// scope: 'personal' = 개인 소유,  'team' = 팀 공유.
// 여기 배열에 항목을 추가하기만 하면 UI/DB 코드 변경 없이 새 쿠폰이 생깁니다.
export const ITEMS = [
  {
    id: 'pass',
    name: '패스권',
    emoji: '🛡️',
    scope: 'personal',
    desc: '벌칙(술)을 1회 방어. 옥션·벌칙 상황에서 소모.',
    startQty: 2, // 게임 시작 시 개인 기본 지급량
  },
  {
    id: 'chance',
    name: '찬스권',
    emoji: '✨',
    scope: 'personal',
    desc: '문제 힌트 요청 또는 재도전 1회.',
    startQty: 1,
  },
  {
    id: 'steal',
    name: '훔치기권',
    emoji: '🥷',
    scope: 'personal',
    desc: '다른 사람의 패스권 1개를 강탈.',
    startQty: 0,
  },
  {
    id: 'teamShield',
    name: '팀 방패',
    emoji: '🏰',
    scope: 'team',
    desc: '팀 전체 벌칙을 1회 무효화. 팀원 누구나 사용.',
    startQty: 1,
  },
]

export const personalItems = () => ITEMS.filter((i) => i.scope === 'personal')
export const teamItems = () => ITEMS.filter((i) => i.scope === 'team')
export const itemById = (id) => ITEMS.find((i) => i.id === id) || null

// 개인/팀 시작 재화 맵을 만들어 주는 헬퍼 (join / 게임초기화 시 사용)
export const initialItems = (scope) =>
  ITEMS.filter((i) => i.scope === scope).reduce((acc, i) => {
    acc[i.id] = i.startQty
    return acc
  }, {})
