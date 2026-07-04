// 테스트 운영용 고정 명단 (SB 방 시드).
// "타는 것" 원본: 스키18/보드5/인스1/톰슨3/인라인1/스키보드1.
// 타는 것만으로는 18:5:1 쏠림 → 최대한 반영하되 균형(≈10명)에 초점 → 보드10/인스10/스키9.
// team: board | ins | ski  (config/teams.js 와 동일)
export const ROSTER = [
  // 보드 팀 (10) — 보드/스키보드 라이더 + 균형용 스키
  { name: '덕구', num: '94', ride: '보드', team: 'board' },
  { name: '성훈', num: '86', ride: '보드', team: 'board' },
  { name: '동해', num: '94', ride: '보드', team: 'board' },
  { name: '규욱', num: '97', ride: '보드', team: 'board' },
  { name: '나로', num: '01', ride: '보드', team: 'board' },
  { name: '넵', num: '98', ride: '스키보드', team: 'board' },
  { name: '덴지', num: '06', ride: '스키', team: 'board' },
  { name: '정태', num: '07', ride: '스키', team: 'board' },
  { name: '돌프', num: '95', ride: '스키', team: 'board' },
  { name: '성이', num: '98', ride: '스키', team: 'board' },

  // 인스 팀 (10) — 인스 + 톰슨/인라인 + 균형용 스키
  { name: '대라', num: '96', ride: '인스', team: 'ins' },
  { name: '오리', num: '96', ride: '톰슨', team: 'ins' },
  { name: '민우', num: '03', ride: '톰슨', team: 'ins' },
  { name: '금둥', num: '94', ride: '톰슨', team: 'ins' },
  { name: '삐약', num: '02', ride: '인라인스키', team: 'ins' },
  { name: '민상', num: '01', ride: '스키', team: 'ins' },
  { name: '별구', num: '97', ride: '스키', team: 'ins' },
  { name: '잼잼', num: '05', ride: '스키', team: 'ins' },
  { name: '잠만보', num: '00', ride: '스키', team: 'ins' },
  { name: '도유', num: '04', ride: '스키', team: 'ins' },

  // 스키 팀 (9) — 남은 스키 라이더
  { name: 'DO', num: '96', ride: '스키', team: 'ski' },
  { name: '펭귄2', num: '93', ride: '스키', team: 'ski' },
  { name: '또이', num: '94', ride: '스키', team: 'ski' },
  { name: '규니', num: '94', ride: '스키', team: 'ski' },
  { name: '베니', num: '03', ride: '스키', team: 'ski' },
  { name: '준성', num: '01', ride: '스키', team: 'ski' },
  { name: '벨콩', num: '00', ride: '스키', team: 'ski' },
  { name: '지용', num: '98', ride: '스키', team: 'ski' },
  { name: '이든', num: '91', ride: '스키', team: 'ski' },
]
