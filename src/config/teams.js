// 3개 팀 정의. 색상은 tailwind.config.js 의 커스텀 컬러와 짝을 맞춤.
export const TEAMS = [
  { id: 'board', name: '보드', color: '#38bdf8', emoji: '🏂' },
  { id: 'ins', name: '인스', color: '#f472b6', emoji: '🧑‍🏫' },
  { id: 'ski', name: '스키', color: '#a3e635', emoji: '⛷️' },
]

export const teamById = (id) => TEAMS.find((t) => t.id === id) || null
