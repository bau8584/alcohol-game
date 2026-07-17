// 몸으로 말해요 — 연기자 폰에만 정답이 뜨는 제스처 게임. 4세트 × 12장.
// hint = 붉은 글자(말해도 됨) / answer = 몸으로 표현할 정답.
import { createDeckGame } from '../deck.jsx'

const A = [
  { hint: '영화', answer: '대도시의 사랑법' },
  { answer: '뉴진스' },
  { hint: 'NETFLIX', answer: '폭싹 속았수다' },
  { hint: '종로 · 장소', answer: '포차' },
  { hint: '동물', answer: '플라밍고' },
  { answer: '이쑤시개' },
  { hint: '직업', answer: '소방관' },
  { answer: '리본체조' },
  { hint: '영화', answer: '스타워즈' },
  { hint: '과일', answer: '레몬' },
  { hint: '동물', answer: '무당벌레' },
  { hint: '속담', answer: '굼벵이도 구르는 재주가 있다' },
]
const B = [
  { hint: '영화', answer: '쥬라기공원' },
  { hint: '영화', answer: '타이타닉' },
  { hint: '속담', answer: '얌전한 고양이 부뚜막에 먼저 올라간다' },
  { hint: '운동', answer: '피겨스케이팅' },
  { hint: 'NETFLIX', answer: '오징어게임' },
  { hint: '운동', answer: '양궁' },
  { answer: '카라' },
  { answer: '도라에몽' },
  { hint: '직업', answer: '나무꾼' },
  { answer: '바다코끼리' },
  { hint: '채소', answer: '가지' },
  { answer: '스컹크' },
]
const C = [
  { hint: '과일', answer: '용과' },
  { hint: '종로 · 장소', answer: '송해길' },
  { answer: '골든' },
  { answer: '드래곤볼' },
  { answer: '택견' },
  { hint: '속담', answer: '바늘 도둑이 소 도둑 된다' },
  { hint: '영화', answer: '아저씨' },
  { answer: '선녀와 나무꾼' },
  { answer: '소녀시대' },
  { answer: '딱따구리' },
  { hint: '속담', answer: '뒤로 넘어져도 코가 깨진다' },
  { hint: '동물', answer: '문어' },
]
const D = [
  { answer: '원피스' },
  { answer: '심청이' },
  { hint: '캐릭터', answer: '짱구' },
  { hint: '영화', answer: '에일리언' },
  { answer: '티아라' },
  { answer: '요가' },
  { hint: '직업', answer: '발레리노' },
  { hint: '과일', answer: '수박' },
  { hint: '속담', answer: '원숭이도 나무에서 떨어진다' },
  { hint: '속담', answer: '가랑비에 옷 젖는 줄 모른다' },
  { answer: '캥거루' },
  { hint: '직업', answer: '선생님' },
]

/* ─────────────── 🔞 성인 세트 (adultEnabled ON일 때만) ─────────────── */
const E = [
  { hint: '패티쉬', answer: '제복' },
  { hint: '패티쉬', answer: '본디지' },
  { answer: '스팽' },
  { hint: '패티쉬', answer: '야외 (플)' },
  { answer: '군플' },
  { hint: '상황', answer: '모텔 체크인' },
  { answer: '백허그' },
  { hint: '영화', answer: '그레이의 50가지 그림자' },
  { answer: '러브샷' },
  { hint: '물건', answer: '수갑' },
  { hint: '상황', answer: '벽치기' },
  { hint: '물건', answer: '채찍' },
]
const F = [
  { answer: '섹시댄스' },
  { hint: '상황', answer: '첫날밤' },
  { hint: '물건', answer: '콘돔' },
  { answer: '엉덩이 씰룩' },
  { hint: '상황', answer: '무릎 위에 앉기' },
  { hint: '패티쉬', answer: '제복 코스프레' },
  { answer: '귓속말 유혹' },
  { hint: '물건', answer: '성인용품' },
  { hint: '상황', answer: '어깨 마사지' },
  { answer: '입술 내밀기' },
  { hint: '상황', answer: '허리 감싸기' },
  { hint: '패티쉬', answer: '발 마사지' },
]

export default createDeckGame({
  id: 'charades',
  name: '몸으로 말해요',
  emoji: '🎭',
  tagline: '연기자 폰에 정답 · 몸으로 설명',
  genres: ['party'],
  traits: ['team'],
  target: 'actor',
  timer: 60,
  // 고정 덱은 한 번 돌면 소모되니, 참가자가 직접 채운 덱으로도 할 수 있게
  collect: { perPlayer: 3, placeholder: '예: 손흥민, 문어, 번지점프' },
  subsets: [
    { key: 'A', label: 'A세트', cards: A },
    { key: 'B', label: 'B세트', cards: B },
    { key: 'C', label: 'C세트', cards: C },
    { key: 'D', label: 'D세트', cards: D },
    { key: 'E', label: '🔞 E세트', cards: E, adult: true },
    { key: 'F', label: '🔞 F세트', cards: F, adult: true },
  ],
})
