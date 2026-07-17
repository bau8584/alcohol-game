// 스파이 — 팀전(팀별) / 개인전(방 전체) 선택. 다수는 진짜 제시어, 소수(스파이)는 가짜 제시어를 받음.
// 역할 배분 = 비밀 정보(웹 고유).
import { useEffect, useState } from 'react'
import { useValue, dbSet } from '../lib/db'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MODES = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
]

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
  ['소맥', '막걸리'],
  ['노래방', '코인노래방'],
  ['제육볶음', '불고기'],
  ['아이유', '아이브'],
  ['카톡', '인스타'],
  ['제주도', '부산'],
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
  ['콧물', '요구르트'],
  ['비듬', '눈꽃'],
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
  ['섹파', '베프'],
  ['신음', '하품'],
  ['애무', '마사지'],
  ['체위', '요가자세'],
  ['러브샷', '건배'],
  ['벽치기', '기대기'],
  ['수갑', '팔찌'],
  ['오르가즘', '롤러코스터'],
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
  const mode = useValue(`${base}/mode`) || 'team'
  const [real, setReal] = useState('')
  const [fake, setFake] = useState('')
  const [counts, setCounts] = useState({}) // 팀별 스파이 수 (팀전)
  const [soloN, setSoloN] = useState(1) // 방 전체 스파이 수 (개인전)
  const soloMax = Math.max(0, players.length - 1)

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
    if (mode === 'solo') {
      const n = Math.min(soloN, soloMax)
      shuffle(players).slice(0, n).forEach((p) => {
        spyIds[p.id] = true
        assigned++
      })
    } else {
      teams.forEach((t) => {
        const n = Math.min(cnt(t.id), Math.max(0, t.members.length - 1))
        shuffle(t.members).slice(0, n).forEach((p) => {
          spyIds[p.id] = true
          assigned++
        })
      })
    }
    if (assigned === 0) return alert('스파이 인원을 1명 이상 지정하세요.')
    dbSet(`${base}/assign`, { realWord: real.trim(), fakeWord: fake.trim(), spyIds, mode })
  }
  const reveal = meta.roundStatus === 'reveal'

  return (
    <div className="text-center">
      {!assign && (
        <div className="mb-4">
          <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
        </div>
      )}
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex gap-2">
          <input value={real} onChange={(e) => setReal(e.target.value)} placeholder="진짜 제시어" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
          <input value={fake} onChange={(e) => setFake(e.target.value)} placeholder="가짜 제시어" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={() => rollFrom(PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲</button>
          {meta.adultEnabled && <button onClick={() => rollFrom(ADULT_PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
        </div>
      </div>

      {/* 스파이 인원 — 개인전: 방 전체 1개 / 팀전: 팀별 */}
      {mode === 'solo' ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>스파이 인원</span>
          <button onClick={() => setSoloN((n) => Math.max(0, n - 1))} disabled={soloN <= 0} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
          <span className="font-display text-2xl w-10">{Math.min(soloN, soloMax)}</span>
          <button onClick={() => setSoloN((n) => Math.min(soloMax, n + 1))} disabled={soloN >= soloMax} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>/ {players.length}명</span>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 max-w-xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          {teams.map((t) => {
            const maxN = Math.max(0, t.members.length - 1)
            return (
              <div key={t.id} className="clay-inset p-2">
                <div className="font-display truncate" style={{ color: t.color }}>{t.name}</div>
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
      )}
      <Button className="mt-3" variant="warn" onClick={distribute}>역할 배분</Button>

      {assign && (
        <div className="mt-4">
          <p style={{ color: 'var(--ink-soft)' }}>진짜 <b style={{ color: 'var(--ink)' }}>{assign.realWord}</b> · 가짜 <b style={{ color: 'var(--ink)' }}>{assign.fakeWord}</b></p>
          {(assign.mode || 'team') === 'solo' ? (
            <div className="mt-2 max-w-md mx-auto clay-inset p-3 text-sm">
              <span style={{ color: 'var(--c-coral)' }}>🕵️ 스파이: {players.filter((p) => assign.spyIds?.[p.id]).map((p) => p.nickname).join(', ') || '없음'}</span>
            </div>
          ) : (
            <div className="mt-2 grid gap-2 max-w-xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              {teams.map((t) => {
                const spyNames = t.members.filter((m) => assign.spyIds?.[m.id]).map((m) => m.nickname)
                return (
                  <div key={t.id} className="clay-inset p-2 text-sm">
                    <div className="font-display truncate" style={{ color: t.color }}>{t.name}</div>
                    <div className="mt-1" style={{ color: 'var(--c-coral)' }}>🕵️ {spyNames.length ? spyNames.join(', ') : '없음'}</div>
                  </div>
                )
              })}
            </div>
          )}
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
  const solo = (assign.mode || 'team') === 'solo'

  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>{solo ? '다 같이' : '우리 팀끼리'} · 주변에 화면 보이지 마세요 🙈</p>
      {!peek ? (
        <Button variant="ghost" className="w-full py-6" onClick={() => setPeek(true)}>👆 내 제시어 확인</Button>
      ) : (
        <div className="clay p-8" style={{ background: reveal ? (amSpy ? 'var(--c-coral)' : 'var(--c-mint)') : 'var(--c-sky)', color: '#fff' }}>
          <div className="opacity-80">내 제시어</div>
          <div className="font-display text-4xl mt-1">{myWord}</div>
          {reveal && <div className="mt-3 font-display text-2xl">{amSpy ? '🕵️ 당신은 스파이였다!' : '😇 시민'}</div>}
          {!reveal && <p className="mt-2 text-sm opacity-80">{solo ? '모두' : '우리 팀 모두'} 같은 단어? 아니면 내가 스파이?</p>}
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
  tagline: '스파이 색출 · 팀전/개인전',
  genres: ['mind'],
  traits: ['team', 'solo'],
  HostView,
  PlayerView,
}
