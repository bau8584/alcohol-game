// 줄줄이 말해요 — 진행자가 낸 주제로 참가자가 돌아가며 항목을 계속 대는 게임.
// 정답 리스트 없음(text 주제만).
import { createDeckGame } from '../deck.jsx'

const topics = [
  '생선 이름 대기',
  '~날로 끝나는 말',
  '라면 이름 대기',
  '~사(師·士)로 끝나는 직업',
  '나라 이름 대기',
  '아이스크림 이름',
].map((text) => ({ text }))

export default createDeckGame({
  id: 'category',
  name: '줄줄이 말해요',
  emoji: '🔗',
  tagline: '주제로 돌아가며 나열하기',
  genres: ['brain'],
  traits: [],
  target: 'host',
  guide: '메인 화면 주제로 돌아가며 이어 말하세요!',
  subsets: [{ key: 'topics', label: '주제', cards: topics }],
})
