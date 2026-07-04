// 스파이 — 팀별로 진행. 각 팀에서 다수는 진짜 제시어, 소수(스파이)는 가짜 제시어를 받음.
// 팀마다 스파이 인원을 +/− 로 지정. 역할 배분 = 비밀 정보(웹 고유).
import { useEffect, useState } from 'react'
import { useValue, dbSet } from '../lib/db'
import { Button } from '../components/ui'

// [시민(진짜) 제시어, 라이어(가짜) 제시어] — 순서 유지(왼쪽=시민, 오른쪽=라이어)
const PAIRS = [
  ['소주', '맥주'],
  ['치킨', '피자'],
  ['스키', '보드'],
  ['바다', '수영장'],
  ['라면', '우동'],
  ['커피', '홍차'],
  ['고양이', '강아지'],
  ['버스', '지하철'],
  ['여름', '겨울'],
  ['영화관', '연극'],
  ['떡볶이', '라볶이'],
  ['첫사랑', '짝사랑'],
  // 병맛 세트 (시민=적나라 / 라이어=멀쩡)
  ['오줌', '아메리카노'],
  ['코딱지', '쌀밥'],
  ['방귀', '향수'],
  ['겨드랑이 털', '머리카락'],
  ['치질', '스마트폰'],
  ['발냄새', '청국장'],
  ['눈물', '안약'],
  ['틀니', '에어팟'],
  ['변기통', '욕조'],
  ['대머리', '달걀'],
]

// 19금 세트 (시민=야한 단어 / 라이어=비슷하지만 멀쩡한 단어)
const ADULT_PAIRS = [
  ['콘돔', '풍선'],
  ['모텔', '호텔'],
  ['야동', '넷플릭스'],
  ['원나잇', '당일치기'],
  ['속옷', '수영복'],
  ['키스', '악수'],
  ['스킨십', '마사지'],
  ['성인용품', '안마기'],
  ['클럽', '헬스장'],
  ['금욕', '다이어트'],
  ['첫경험', '첫출근'],
  ['가슴', '쿠션'],
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HostView({ base, meta, players, teams }) {
  const assign = useValue(`${base}/assign`)
  const [real, setReal] = useState('')
  const [fake, setFake] = useState('')
  const [counts, setCounts] = useState({}) // 팀별 스파이 수

  useEffect(() => {
    if (assign) {
      setReal(assign.realWord || '')
      setFake(assign.fakeWord || '')
    }
  }, [assign])

  const cnt = (tid) => counts[tid] ?? 1
  const setCount = (tid, d, maxN) =>
    setCounts((c) => ({ ...c, [tid]: Math.min(maxN, Math.max(0, (c[tid] ?? 1) + d)) }))

  const rollFrom = (arr) => {
    const [r, f] = arr[Math.floor(Math.random() * arr.length)]
    setReal(r)
    setFake(f)
  }
  const distribute = () => {
    if (!real.trim() || !fake.trim()) return alert('진짜/가짜 제시어를 모두 입력하세요. (🎲로 랜덤)')
    if (!players.length) return alert('참가자가 없습니다.')
    const spyIds = {}
    let assigned = 0
    teams.forEach((t) => {
      const n = Math.min(cnt(t.id), Math.max(0, t.members.length - 1))
      shuffle(t.members).slice(0, n).forEach((p) => {
        spyIds[p.id] = true
        assigned++
      })
    })
    if (assigned === 0) return alert('스파이 인원을 1명 이상 지정하세요.')
    dbSet(`${base}/assign`, { realWord: real.trim(), fakeWord: fake.trim(), spyIds })
  }
  const reveal = meta.roundStatus === 'reveal'

  return (
    <div className="text-center">
      <div className="flex gap-2 justify-center max-w-md mx-auto">
        <input value={real} onChange={(e) => setReal(e.target.value)} placeholder="진짜 제시어" className="clay-inset flex-1 px-3 py-2 text-center" />
        <input value={fake} onChange={(e) => setFake(e.target.value)} placeholder="가짜 제시어" className="clay-inset flex-1 px-3 py-2 text-center" />
        <button onClick={() => rollFrom(PAIRS)} className="clay-btn px-3 text-2xl shrink-0" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲</button>
        <button onClick={() => rollFrom(ADULT_PAIRS)} className="clay-btn px-3 text-2xl shrink-0" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲</button>
      </div>

      {/* 팀별 스파이 인원 */}
      <div className="mt-3 grid grid-cols-3 gap-2 max-w-xl mx-auto">
        {teams.map((t) => {
          const maxN = Math.max(0, t.members.length - 1)
          return (
            <div key={t.id} className="clay-inset p-2">
              <div className="font-display" style={{ color: t.color }}>{t.emoji} {t.name}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button onClick={() => setCount(t.id, -1, maxN)} disabled={cnt(t.id) <= 0} className="w-8 h-8 rounded-full clay-btn text-lg disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
                <span className="font-display text-xl w-8">{Math.min(cnt(t.id), maxN)}</span>
                <button onClick={() => setCount(t.id, 1, maxN)} disabled={cnt(t.id) >= maxN} className="w-8 h-8 rounded-full clay-btn text-lg disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{t.members.length}명</div>
            </div>
          )
        })}
      </div>
      <Button className="mt-3" variant="warn" onClick={distribute}>역할 배분</Button>

      {assign && (
        <div className="mt-4">
          <p style={{ color: 'var(--ink-soft)' }}>진짜 <b style={{ color: 'var(--ink)' }}>{assign.realWord}</b> · 가짜 <b style={{ color: 'var(--ink)' }}>{assign.fakeWord}</b></p>
          <div className="mt-2 grid grid-cols-3 gap-2 max-w-xl mx-auto">
            {teams.map((t) => {
              const spyNames = t.members.filter((m) => assign.spyIds?.[m.id]).map((m) => m.nickname)
              return (
                <div key={t.id} className="clay-inset p-2 text-sm">
                  <div className="font-display" style={{ color: t.color }}>{t.emoji} {t.name}</div>
                  <div className="mt-1" style={{ color: 'var(--c-coral)' }}>🕵️ {spyNames.length ? spyNames.join(', ') : '없음'}</div>
                </div>
              )
            })}
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>(스파이는 진행자만 보여요)</p>
          {reveal && <p className="mt-2 font-display text-2xl animate-pop" style={{ color: 'var(--c-coral)' }}>정답 공개!</p>}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const assign = useValue(`${base}/assign`)
  const [peek, setPeek] = useState(false)
  if (!assign) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>역할 배분 대기 중… 🤫</p>
  const amSpy = !!assign.spyIds?.[me.id]
  const myWord = amSpy ? assign.fakeWord : assign.realWord
  const reveal = meta.roundStatus === 'reveal'

  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>우리 팀끼리 · 주변에 화면 보이지 마세요 🙈</p>
      {!peek ? (
        <Button variant="ghost" className="w-full py-6" onClick={() => setPeek(true)}>👆 내 제시어 확인</Button>
      ) : (
        <div className="clay p-8" style={{ background: reveal ? (amSpy ? 'var(--c-coral)' : 'var(--c-mint)') : 'var(--c-sky)', color: '#fff' }}>
          <div className="opacity-80">내 제시어</div>
          <div className="font-display text-4xl mt-1">{myWord}</div>
          {reveal && <div className="mt-3 font-display text-2xl">{amSpy ? '🕵️ 당신은 스파이였다!' : '😇 시민'}</div>}
          {!reveal && <p className="mt-2 text-sm opacity-80">우리 팀 모두 같은 단어? 아니면 내가 스파이?</p>}
          <button className="mt-4 text-sm underline opacity-80" onClick={() => setPeek(false)}>가리기</button>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'spy',
  name: '스파이',
  emoji: '🕵️',
  tagline: '팀별 스파이 색출',
  genres: ['mind'],
  traits: ['team'],
  HostView,
  PlayerView,
}
