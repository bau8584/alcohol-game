// 너 이름이 뭐니 — 인물 사진 + 정답 데이터. 36장을 3판 프리셋(각 12장)으로 분할.
// 사진은 src/assets/faces/ 에 번들. 파일명 키(s5q01 등)로 참조.
const urls = import.meta.glob('../../assets/faces/*.{jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
})

// 파일명(확장자 제외) → URL 맵
const byKey = {}
for (const path in urls) {
  const name = path.split('/').pop().replace(/\.(jpg|jpeg|png)$/i, '')
  byKey[name] = urls[path]
}

// 정답 키 (exgames/너이름이뭐니_정답키.md 기준)
const A = {
  s5q01: '최우식', s5q02: '양희은', s5q03: '니키 미나즈', s5q04: '조 바이든',
  s5q05: '조세호', s5q06: '랄랄', s5q07: '육성재', s5q08: '스머프',
  s5q09: 'BTS 진', s5q10: '천사소녀 네티', s5q11: '안창림', s5q12: '김연경',
  s5q13: '정우성', s5q14: '이재명', s5q15: '샘 해밍턴', s5q16: '버락 오바마',
  s5q17: '핑핑이', s5q18: '곽튜브',
  s6q01: '나미리', s6q02: '샘 스미스', s6q03: '효린', s6q04: '오은영',
  s6q05: '박태환', s6q06: '정해인', s6q07: '카디비', s6q08: '도경수(디오)',
  s6q09: '박서준', s6q10: '신은경', s6q11: '박형식', s6q12: '다니엘(뉴진스)',
  s6q13: '이제훈', s6q14: '루피', s6q15: '남주혁', s6q16: '김우빈',
  s6q17: '스티브 잡스', s6q18: '김수미',
}

const card = (key) => ({ key, url: byKey[key], answer: A[key] })

// 3판 프리셋 (각 12장) — 유명인·캐릭터가 고루 섞이도록 구성
export const PRESETS = [
  {
    key: 'p1',
    label: '1판',
    cards: ['s5q01', 's5q02', 's5q03', 's5q04', 's5q05', 's5q06',
            's5q07', 's5q08', 's5q09', 's5q10', 's5q11', 's5q12'].map(card),
  },
  {
    key: 'p2',
    label: '2판',
    cards: ['s5q13', 's5q14', 's5q15', 's5q16', 's5q17', 's5q18',
            's6q01', 's6q02', 's6q03', 's6q04', 's6q05', 's6q06'].map(card),
  },
  {
    key: 'p3',
    label: '3판',
    cards: ['s6q07', 's6q08', 's6q09', 's6q10', 's6q11', 's6q12',
            's6q13', 's6q14', 's6q15', 's6q16', 's6q17', 's6q18'].map(card),
  },
]

export const presetByKey = (k) => PRESETS.find((p) => p.key === k) || null
