// 비밀 미션 — 각자 폰에 은밀한 미션을 비공개 배분. 라운드 내내 몰래 수행하고,
// 공개 때 누가 무슨 미션이었는지 드러난다. (비밀 정보 배분 = 웹 고유)
import { useState } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

const MISSIONS = [
  '대화에 "사랑" 3번 자연스럽게 넣기',
  '누군가를 5번 칭찬하기',
  '질문에 무조건 질문으로 답하기',
  '한 사람 말끝마다 살짝 따라 하기',
  '10분간 존댓말만 쓰기',
  '몰래 3명과 하이파이브 하기',
  '내 얘기(자기 자랑) 절대 안 하기',
  '모든 말에 "레전드" 붙이기',
  '한 명을 은근히 계속 편들기',
  '최대한 안 웃기',
  '남의 말에 무조건 동의하기',
  '주제를 계속 음식으로 돌리기',
  '"그러니까"를 입버릇처럼 쓰기',
  '가장 조용한 사람을 대화에 끌어들이기',
  '건배를 3번 유도하기',
  '누군가의 별명을 새로 지어 부르기',
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HostView({ base, meta, players }) {
  const assigned = useValue(`${base}/mission`)
  const reveal = meta.roundStatus === 'reveal'

  const distribute = () => {
    if (players.length < 2) return alert('최소 2명 필요.')
    const pool = shuffle(MISSIONS)
    const map = {}
    players.forEach((p, i) => (map[p.id] = pool[i % pool.length]))
    dbSet(`${base}/mission`, map)
  }

  return (
    <div className="text-center">
      <Button variant="warn" onClick={distribute}>{assigned ? '🔄 미션 다시 배분' : '🎯 미션 배분'}</Button>
      {assigned && !reveal && <p className="mt-4" style={{ color: 'var(--ink-soft)' }}>각자 폰에서 자기 미션 확인 중… 🤫<br />몰래 수행하다가 ‘공개’를 누르면 정답 공개!</p>}
      {assigned && reveal && (
        <div className="mt-4 space-y-1.5 max-w-md mx-auto text-left">
          {players.map((p) => (
            <div key={p.id} className="clay-inset px-3 py-2">
              <b>{p.nickname}</b> <span style={{ color: 'var(--ink-soft)' }}>— {assigned[p.id] || '(없음)'}</span>
            </div>
          ))}
          <p className="text-center text-sm mt-2" style={{ color: 'var(--c-coral)' }}>성공 못 한 사람은 벌칙! 🍺</p>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const assigned = useValue(`${base}/mission`)
  const [peek, setPeek] = useState(false)
  const reveal = meta.roundStatus === 'reveal'
  const mine = assigned?.[me.id]

  if (!assigned) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>미션 배분 대기 중… 🤫</p>
  if (reveal) return (
    <div className="text-center clay p-6" style={{ background: 'var(--c-grape)', color: '#fff' }}>
      <div className="opacity-80">내 미션이었던 것</div>
      <div className="font-display text-2xl mt-1">{mine || '(없음)'}</div>
      <p className="mt-2 opacity-90">성공했나요? 😏</p>
    </div>
  )
  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>남들이 못 보게! 🙈</p>
      {!peek ? (
        <Button variant="ghost" className="w-full py-6" onClick={() => setPeek(true)}>👆 내 비밀 미션 확인</Button>
      ) : (
        <div className="clay p-6" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="opacity-80">🤫 비밀 미션</div>
          <div className="font-display text-2xl mt-1">{mine || '(없음)'}</div>
          <p className="mt-2 text-sm opacity-90">티 안 나게 수행하세요!</p>
          <button className="mt-3 text-sm underline opacity-80" onClick={() => setPeek(false)}>가리기</button>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'mission',
  name: '비밀 미션',
  emoji: '🕵️‍♀️',
  tagline: '은밀한 미션 배분 · 소규모',
  genres: ['mind', 'party'],
  traits: ['solo'],
  controls: { prompt: false },
  HostView,
  PlayerView,
}
