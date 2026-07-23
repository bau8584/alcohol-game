// 스파이 — 팀전(팀별) / 개인전(방 전체) 선택. 다수는 진짜 제시어, 소수(스파이)는 가짜 제시어를 받음.
// 역할 배분 = 비밀 정보(웹 고유).
// 옵션 ①가짜 제시어를 그냥 '스파이'로(=스파이가 자기 정체를 앎) ②진행자도 참여(제시어 숨김) or 출제자만.
import { useEffect, useState } from 'react'
import { useValue, dbSet } from '../lib/db'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MODES = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
]

const SPY_WORD = '스파이' // '가짜=스파이' 옵션에서 스파이에게 그대로 보여주는 단어

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
  // 추가 세트 — 헷갈리는 비슷한 짝
  ['짜장면', '짬뽕'],
  ['호랑이', '사자'],
  ['축구', '야구'],
  ['봄', '가을'],
  ['아침', '저녁'],
  ['펭귄', '오리'],
  ['딸기', '체리'],
  ['교회', '절'],
  ['비행기', '기차'],
  ['우산', '양산'],
  ['샴푸', '린스'],
  ['연필', '볼펜'],
  ['사과', '토마토'],
  ['만두', '교자'],
  ['김밥', '유부초밥'],
  ['햄버거', '샌드위치'],
  ['콜라', '사이다'],
  ['수박', '참외'],
  ['안경', '선글라스'],
  ['닌텐도', '플스'],
  ['유튜브', '틱톡'],
  ['에어컨', '선풍기'],
  ['이불', '담요'],
  ['샤워', '목욕'],
  ['라디오', '팟캐스트'],
  ['볼링', '당구'],
  ['마라탕', '떡볶이'],
  ['아메리카노', '라떼'],
  ['치약', '가글'],
  ['운동화', '구두'],
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
  ['땀', '이슬'],
  ['가래', '젤리'],
  ['여드름', '두드러기'],
  ['새치', '국수'],
  ['모기', '파리'],
  ['무좀', '버섯'],
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
  // 추가 19금 세트
  ['썸', '우정'],
  ['키스방', '노래방'],
  ['소개팅', '면접'],
  ['밀당', '줄다리기'],
  ['모유', '두유'],
  ['정력', '체력'],
  ['숙취', '피로'],
  ['러브호텔', '펜션'],
  ['교복플레이', '코스프레'],
  ['스와이프', '넘기기'],
  ['에프터', '2차'],
  ['골뱅이', '해장국'],
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
  const [spyKnows, setSpyKnows] = useState(false) // 가짜 제시어 = '스파이'
  const [counts, setCounts] = useState({}) // 팀별 스파이 수 (팀전)
  const [soloN, setSoloN] = useState(1) // 방 전체 스파이 수 (개인전)

  // 진행자가 참가자이기도 한지(폰 1대 진행+참여). 그렇다면 참여/출제자 선택 가능.
  const hostId = meta.hostPlayerId
  const hostIsPlayer = !!hostId && players.some((p) => p.id === hostId)
  const [hostPlays, setHostPlays] = useState(true) // 기본: 나도 참여
  const effHostPlays = hostIsPlayer && hostPlays // 진행자 참여 → 제시어 숨김
  const excludeHost = hostIsPlayer && !hostPlays // 출제자만 → 스파이 풀에서 제외

  const poolPlayers = excludeHost ? players.filter((p) => p.id !== hostId) : players
  const soloMax = Math.max(0, poolPlayers.length - 1)
  const membersOf = (t) => (excludeHost ? t.members.filter((m) => m.id !== hostId) : t.members)

  useEffect(() => {
    if (assign) {
      setReal(assign.realWord || '')
      setFake(assign.fakeWord || '')
    }
  }, [assign])

  const cnt = (tid) => counts[tid] ?? 1
  const setCount = (tid, d, maxN) =>
    setCounts((c) => ({ ...c, [tid]: Math.min(maxN, Math.max(0, (c[tid] ?? 1) + d)) }))

  // 실제 배분. pair가 주어지면(진행자 참여 플로우) 그 짝을 쓰고, 아니면 입력값 사용.
  const distribute = (pair) => {
    let realW, fakeW
    if (pair) {
      realW = pair[0]
      fakeW = spyKnows ? SPY_WORD : pair[1]
    } else {
      realW = real.trim()
      fakeW = spyKnows ? SPY_WORD : fake.trim()
      if (!realW || !fakeW) return alert('진짜/가짜 제시어를 모두 입력하세요. (🎲로 랜덤)')
    }
    if (!poolPlayers.length) return alert('참가자가 없습니다.')

    const spyIds = {}
    let assigned = 0
    if (mode === 'solo') {
      const n = Math.min(soloN, soloMax)
      shuffle(poolPlayers).slice(0, n).forEach((p) => { spyIds[p.id] = true; assigned++ })
    } else {
      teams.forEach((t) => {
        const mem = membersOf(t)
        const n = Math.min(cnt(t.id), Math.max(0, mem.length - 1))
        shuffle(mem).slice(0, n).forEach((p) => { spyIds[p.id] = true; assigned++ })
      })
    }
    if (assigned === 0) return alert('스파이 인원을 1명 이상 지정하세요.')
    dbSet(`${base}/assign`, {
      realWord: realW,
      fakeWord: fakeW,
      spyIds,
      mode,
      hideFromHost: effHostPlays,
      excludeHostId: excludeHost ? hostId : null,
    })
  }

  // 🎲 버튼: 진행자 참여면 '뽑고 즉시 배분(제시어 숨김)', 출제자면 입력창 채우기.
  const rollFrom = (arr) => {
    const pair = arr[Math.floor(Math.random() * arr.length)]
    if (effHostPlays) { distribute(pair); return }
    setReal(pair[0])
    setFake(pair[1])
  }

  const reveal = meta.roundStatus === 'reveal'
  const hidden = assign?.hideFromHost && !reveal // 진행자 참여 → 공개 전엔 진행자에게도 숨김

  return (
    <div className="text-center">
      {!assign && (
        <>
          <div className="mb-3">
            <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
          </div>

          {/* 진행자 참여/출제자 선택 (폰 1대 진행+참여일 때만) */}
          {hostIsPlayer && (
            <div className="mb-3 max-w-md mx-auto">
              <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>진행자인 나는?</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setHostPlays(true)} className="clay-btn px-4 py-2 font-display" style={hostPlays ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>🎮 나도 참여</button>
                <button onClick={() => setHostPlays(false)} className="clay-btn px-4 py-2 font-display" style={!hostPlays ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>🎤 출제자만</button>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                {hostPlays ? '제시어는 🎲로만 뽑히고 나에게도 숨겨져요 (내 플레이 탭에서 확인)' : '나는 빠지고 제시어를 직접 정해요'}
              </div>
            </div>
          )}

          {/* 가짜 제시어 = '스파이' 옵션 */}
          <label className="inline-flex items-center gap-2 mb-3 text-sm cursor-pointer clay-inset px-3 py-2">
            <input type="checkbox" checked={spyKnows} onChange={(e) => setSpyKnows(e.target.checked)} />
            <span>🕵️ 가짜 제시어를 <b>‘스파이’</b>로 (스파이가 자기 정체를 앎)</span>
          </label>

          {/* 제시어 입력 — 진행자 참여면 숨김(치트 방지), 출제자만 노출 */}
          {!effHostPlays && (
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex gap-2">
                <input value={real} onChange={(e) => setReal(e.target.value)} placeholder="진짜 제시어" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
                <input value={spyKnows ? SPY_WORD : fake} onChange={(e) => setFake(e.target.value)} disabled={spyKnows} placeholder="가짜 제시어" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center disabled:opacity-60" />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-center mt-2">
            <button onClick={() => rollFrom(PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲{effHostPlays ? ' 배분' : ''}</button>
            {meta.adultEnabled && <button onClick={() => rollFrom(ADULT_PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
          </div>
          {effHostPlays && <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>🎲를 누르면 무작위로 뽑아 바로 배분해요 (진행자도 정답 모름)</p>}

          {/* 스파이 인원 — 개인전: 방 전체 1개 / 팀전: 팀별 */}
          {mode === 'solo' ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>스파이 인원</span>
              <button onClick={() => setSoloN((n) => Math.max(0, n - 1))} disabled={soloN <= 0} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
              <span className="font-display text-2xl w-10">{Math.min(soloN, soloMax)}</span>
              <button onClick={() => setSoloN((n) => Math.min(soloMax, n + 1))} disabled={soloN >= soloMax} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
              <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>/ {poolPlayers.length}명</span>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 max-w-xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              {teams.map((t) => {
                const maxN = Math.max(0, membersOf(t).length - 1)
                return (
                  <div key={t.id} className="clay-inset p-2">
                    <div className="font-display truncate" style={{ color: t.color }}>{t.name}</div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <button onClick={() => setCount(t.id, -1, maxN)} disabled={cnt(t.id) <= 0} className="w-8 h-8 rounded-full clay-btn text-lg disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
                      <span className="font-display text-xl w-8">{Math.min(cnt(t.id), maxN)}</span>
                      <button onClick={() => setCount(t.id, 1, maxN)} disabled={cnt(t.id) >= maxN} className="w-8 h-8 rounded-full clay-btn text-lg disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{membersOf(t).length}명</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 출제자 플로우만 별도 '역할 배분' 버튼 (진행자 참여는 🎲가 곧 배분) */}
          {!effHostPlays && <Button className="mt-3" variant="warn" onClick={() => distribute()}>역할 배분</Button>}
        </>
      )}

      {assign && (
        <div className="mt-2">
          {hidden ? (
            <div className="clay p-6 max-w-md mx-auto" style={{ background: 'var(--c-sky)', color: '#fff' }}>
              <div className="text-4xl">🙈</div>
              <p className="mt-2 font-display text-xl">배분 완료 · 당신도 참여 중</p>
              <p className="mt-1 text-sm opacity-90">제시어·스파이는 <b>🎮 내 플레이 탭</b>에서 확인하세요. 진행자도 정답을 몰라요!</p>
              <p className="mt-1 text-xs opacity-80">토론 끝나면 👁 공개를 누르세요.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const assign = useValue(`${base}/assign`)
  const [peek, setPeek] = useState(false)
  if (!assign) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>역할 배분 대기 중… 🤫</p>

  // 출제자(참여 안 함)로 빠진 진행자
  if (assign.excludeHostId && assign.excludeHostId === me.id) {
    return (
      <div className="text-center py-8 clay" style={{ background: 'var(--surface)', color: 'var(--ink)' }}>
        <div className="text-5xl">🎤</div>
        <p className="mt-2 font-display text-xl">당신은 출제자예요</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>이번 판은 구경 · 🖥 진행 탭에서 스파이를 지켜보세요.</p>
      </div>
    )
  }

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
