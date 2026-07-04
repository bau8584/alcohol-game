// 재화(쿠폰) 정의.
// scope: 'personal' = 개인 소유,  'team' = 팀 공유.
// 여기 배열에 항목을 추가하기만 하면 UI/DB 코드 변경 없이 새 쿠폰이 생깁니다.
export const ITEMS = [
  {
    id: 'pass',
    name: '패스권',
    emoji: '🛡️',
    scope: 'personal',
    desc: '술(벌칙)을 1회 면제. 마셔야 할 때 폰에서 보여주고 진행자가 차감.',
    startQty: 1, // 게임 시작 시 개인 기본 지급량
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
