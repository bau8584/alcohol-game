// 재화(쿠폰) 정의.
// scope: 'personal' = 개인 소유,  'team' = 팀 공유.
// 여기 배열에 항목을 추가하기만 하면 UI/DB 코드 변경 없이 새 쿠폰이 생깁니다.
// 재화(쿠폰) 시스템은 제거됨(패스권 삭제). 필요하면 여기 배열에 다시 추가하면 UI가 되살아납니다.
export const ITEMS = []

export const personalItems = () => ITEMS.filter((i) => i.scope === 'personal')
export const teamItems = () => ITEMS.filter((i) => i.scope === 'team')
export const itemById = (id) => ITEMS.find((i) => i.id === id) || null

// 개인/팀 시작 재화 맵을 만들어 주는 헬퍼 (join / 게임초기화 시 사용)
export const initialItems = (scope) =>
  ITEMS.filter((i) => i.scope === scope).reduce((acc, i) => {
    acc[i.id] = i.startQty
    return acc
  }, {})
