// 양세찬 게임 (파드 스피드) — 2~3명 파드로 나눠 동시 진행.
// 각 파드에서 '핫시트' 1명은 자기 이마 단어를 못 봄 → 나머지 팀원이 힌트(이름·단어 직접 말 금지) →
// 핫시트가 '맞혔다!' → 먼저 맞힌 파드 순위. 단어는 프리셋 은행 또는 팀원이 직접 써주기.
// 핫시트는 '다음 라운드'로 교대. (mode:'self' — 게임이 phase를 직접 관리)
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction } from '../lib/db'
import { Button } from '../components/ui'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 프리셋 단어 은행 ──
const BANKS = {
  star: ['아이유', '손흥민', '유재석', '뷔', '카리나', '임영웅', '박명수', '제니', '강호동', '차은우', '김연아', '마동석', '아이브', '뉴진스', '이광수'],
  animal: ['사자', '펭귄', '카피바라', '코끼리', '기린', '판다', '고슴도치', '나무늘보', '캥거루', '문어', '알파카', '미어캣', '수달', '하마', '다람쥐'],
  food: ['치킨', '마라탕', '곱창', '떡볶이', '삼겹살', '초밥', '마카롱', '붕어빵', '탕후루', '피자', '떡국', '파스타', '빙수', '라면', '순대'],
  char: ['뽀로로', '피카츄', '짱구', '도라에몽', '스폰지밥', '미키마우스', '헬로키티', '슈퍼마리오', '아기상어', '잔망루피', '미니언즈', '쿠로미', '올라프', '둘리', '카카오프렌즈'],
  job: ['의사', '유튜버', '프로게이머', '경찰', '소방관', '선생님', '요리사', '아이돌', '변호사', '운동선수', '개그맨', '바리스타', '파일럿', '간호사', '미용사'],
  movie: ['기생충', '오징어게임', '어벤져스', '겨울왕국', '해리포터', '스파이더맨', '부산행', '극한직업', '우영우', '슬램덩크', '명량', '도깨비', '엘사', '조커', '인사이드아웃'],
}
const ADULT_BANK = ['콘돔', '모텔', '키스', '러브샷', '원나잇', '스킨십', '첫경험', '클럽', '소개팅', '허니문', '19금', '밤일', '섹시', '이상형', '금욕']
const FREE_ALL = Object.values(BANKS).flat()

const CATEGORIES = [
  { key: 'star', label: '연예인', hint: '예: 아이유, 손흥민' },
  { key: 'animal', label: '동물', hint: '예: 사자, 카피바라' },
  { key: 'food', label: '음식', hint: '예: 치킨, 마라탕' },
  { key: 'char', label: '캐릭터', hint: '예: 뽀로로, 피카츄' },
  { key: 'job', label: '직업', hint: '예: 의사, 유튜버' },
  { key: 'movie', label: '영화·드라마', hint: '예: 기생충, 오징어게임' },
  { key: 'free', label: '자유(섞기)', hint: '전 주제 섞어서' },
  { key: 'adult', label: '19금', hint: '야한 단어 🔞', adult: true },
]
const catLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label || k
const bankFor = (cat) => (cat === 'adult' ? ADULT_BANK : cat === 'free' ? FREE_ALL : BANKS[cat] || FREE_ALL)

// 접속자 → 2~3명 파드로 (마지막 1명 파드는 앞에 합침)
function formPods(ids, size) {
  const s = shuffle(ids)
  const pods = []
  for (let i = 0; i < s.length; i += size) pods.push(s.slice(i, i + size))
  if (pods.length > 1 && pods[pods.length - 1].length === 1) {
    const last = pods.pop()
    pods[pods.length - 1].push(...last)
  }
  return pods
}
const hotSeatOf = (pod, round) => pod[round % pod.length]
// 프리셋 단어 배정: 각 파드 핫시트에게 서로 다른 단어
function assignPreset(pods, round, bank) {
  const deck = shuffle(bank)
  const word = {}
  pods.forEach((pod, i) => { word[hotSeatOf(pod, round)] = deck[i % deck.length] })
  return word
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, meta, players }) {
  const cfg = useValue(`${base}/cfg`)
  const podsRaw = useValue(`${base}/pods`)
  const round = useValue(`${base}/round`) || 0
  const word = useValue(`${base}/word`) || {}
  const done = useValue(`${base}/done`) || {}
  const phase = useValue(`${base}/phase`) || 'setup'
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const nameOf = (id) => byId[id]?.nickname || '?'
  const pods = podsRaw || []

  // 로컬 셋업 초안
  const [source, setSource] = useState('preset')
  const [category, setCategory] = useState('star')
  const [podSize, setPodSize] = useState(2)

  const connected = players.filter((p) => p.connected !== false)
  const start = () => {
    if (connected.length < 2) return alert('최소 2명 필요.')
    const pods = formPods(connected.map((p) => p.id), podSize)
    const c = { source, category, podSize }
    const preset = source === 'preset'
    dbSet(base, {
      cfg: c, pods, round: 0, done: null,
      word: preset ? assignPreset(pods, 0, bankFor(category)) : null,
      phase: preset ? 'race' : 'write',
    })
  }
  const nextRound = () => {
    const r = round + 1
    const preset = cfg?.source === 'preset'
    dbUpdate(base, {
      round: r, done: null,
      word: preset ? assignPreset(pods, r, bankFor(cfg.category)) : null,
      phase: preset ? 'race' : 'write',
    })
  }
  const writtenCount = pods.filter((pod) => word[hotSeatOf(pod, round)]).length
  const doneCount = Object.keys(done).length

  // ── 셋업 ──
  if (phase === 'setup' || !pods.length) {
    return (
      <div className="text-center">
        <p className="font-display text-lg">🃏 양세찬 게임 (파드 스피드)</p>
        <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          2~3명 파드로 나눠 동시에! 핫시트는 자기 단어를 못 보고, 팀원 힌트로 맞혀요. <b>먼저 맞힌 파드 승!</b>
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {[['preset', '📋 프리셋 단어'], ['write', '✍️ 직접 써주기']].map(([k, l]) => (
            <button key={k} onClick={() => setSource(k)} className="clay-btn px-4 py-2 font-display" style={source === k ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{l}</button>
          ))}
        </div>

        <div className="mt-3">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>주제</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {CATEGORIES.filter((c) => meta.adultEnabled || !c.adult).map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)} className="clay-btn px-3 py-1.5 text-sm" style={category === c.key ? { background: c.adult ? '#e64545' : 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{c.label}</button>
            ))}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{source === 'write' ? '직접 써주기 모드: 주제는 작성 가이드로만 쓰여요' : ''}</p>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>파드 크기</span>
          {[2, 3].map((s) => (
            <button key={s} onClick={() => setPodSize(s)} className="clay-btn px-4 py-1.5 font-display" style={podSize === s ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{s}명</button>
          ))}
          <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>· 접속 {connected.length}명</span>
        </div>

        <Button className="mt-4 text-xl px-8 py-3" onClick={start} disabled={connected.length < 2}>🚀 파드 짜고 시작</Button>
      </div>
    )
  }

  // ── 공통: 파드 보드 ──
  const board = (
    <div className="mt-4 grid gap-2 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      {pods.map((pod, i) => {
        const hs = hotSeatOf(pod, round)
        const order = done[i]
        const medal = order === 1 ? '🥇' : order === 2 ? '🥈' : order === 3 ? '🥉' : order ? `${order}등` : null
        return (
          <div key={i} className="clay-inset p-2 text-left text-sm" style={order === 1 ? { outline: '2px solid var(--c-mint)' } : {}}>
            <div className="flex justify-between items-center">
              <span className="font-display">파드 {i + 1}</span>
              {medal ? <span className="font-display">{medal}</span> : <span style={{ color: 'var(--ink-soft)' }}>{phase === 'race' ? '진행 중…' : ''}</span>}
            </div>
            <div className="mt-1">
              🎯 <b>{nameOf(hs)}</b> <span style={{ color: 'var(--ink-soft)' }}>(핫시트)</span>
              {phase !== 'race' || order ? <span className="ml-1 font-display" style={{ color: 'var(--c-coral)' }}>{word[hs] || (phase === 'write' ? '작성 대기' : '')}</span> : null}
            </div>
            <div style={{ color: 'var(--ink-soft)' }}>힌트: {pod.filter((p) => p !== hs).map(nameOf).join(', ') || '—'}</div>
          </div>
        )
      })}
    </div>
  )

  // ── 작성 대기 ──
  if (phase === 'write') {
    return (
      <div className="text-center">
        <p className="font-display text-lg">✍️ 팀원이 핫시트 단어 작성 중… ({writtenCount}/{pods.length})</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제: {catLabel(cfg?.category)} · 각 파드에서 핫시트 빼고 아무나 써주면 돼요</p>
        {board}
        <Button className="mt-4" onClick={() => dbUpdate(base, { phase: 'race' })} disabled={writtenCount < pods.length}>
          {writtenCount < pods.length ? `아직 ${pods.length - writtenCount}파드 남음` : '▶ 레이스 시작!'}
        </Button>
      </div>
    )
  }

  // ── 레이스 ──
  if (phase === 'race') {
    return (
      <div className="text-center">
        <p className="font-display text-xl">🏁 레이스! 먼저 맞힌 파드 승</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>맞힌 파드 {doneCount}/{pods.length} · 팀원은 힌트, 핫시트는 맞히고 ‘맞혔다!’</p>
        {board}
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="warn" onClick={() => dbUpdate(base, { phase: 'result' })}>🏁 결과 보기</Button>
        </div>
      </div>
    )
  }

  // ── 결과 ──
  const ranking = pods.map((pod, i) => ({ i, order: done[i] || 999, hs: hotSeatOf(pod, round) })).sort((a, b) => a.order - b.order)
  const winner = ranking.find((r) => r.order === 1)
  return (
    <div className="text-center">
      <p className="font-display text-2xl">🏆 결과</p>
      {winner ? <p className="mt-1 font-display text-xl" style={{ color: 'var(--c-mint)' }}>🥇 파드 {winner.i + 1} ({nameOf(winner.hs)}) 승리!</p> : <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>아무도 못 맞혔어요 🥲</p>}
      {board}
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="primary" onClick={nextRound}>🔄 다음 라운드 (핫시트 교대)</Button>
        <Button variant="ghost" onClick={() => dbSet(base, null)}>↩ 새 게임(파드 다시)</Button>
      </div>
    </div>
  )
}

/* ═══════════════ 참가자 ═══════════════ */
function PlayerView({ base, players, me }) {
  const podsRaw = useValue(`${base}/pods`)
  const round = useValue(`${base}/round`) || 0
  const word = useValue(`${base}/word`) || {}
  const done = useValue(`${base}/done`) || {}
  const phase = useValue(`${base}/phase`) || 'setup'
  const cfg = useValue(`${base}/cfg`)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const nameOf = (id) => byId[id]?.nickname || '?'
  const [text, setText] = useState('')
  const pods = podsRaw || []

  const podIdx = pods.findIndex((pod) => pod.includes(me.id))
  const pod = podIdx >= 0 ? pods[podIdx] : null

  if (!pod) {
    return <div className="text-center py-12"><div className="text-5xl">🃏</div><p className="mt-3 font-display text-xl">{phase === 'setup' ? '진행자가 파드를 짜는 중…' : '이번 판은 미참여 · 다음 게임에 참여돼요'}</p></div>
  }

  const hotSeat = hotSeatOf(pod, round)
  const amHot = hotSeat === me.id
  const myWord = word[hotSeat]
  const myOrder = done[podIdx]
  const mates = pod.filter((p) => p !== me.id).map(nameOf)

  // 작성 단계 — 팀원이 핫시트 단어 써주기
  if (phase === 'write') {
    if (amHot) {
      return <div className="text-center py-12"><div className="text-5xl">🙈</div><p className="mt-3 font-display text-xl">팀원이 네 단어를 정하는 중…</p><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>넌 못 봐! 조용히 기다려요</p></div>
    }
    if (myWord) {
      return <div className="text-center py-12"><div className="text-5xl">✅</div><p className="mt-3 font-display text-xl">{nameOf(hotSeat)}의 단어 완료!</p><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>레이스 시작을 기다려요</p></div>
    }
    const submit = () => text.trim() && dbSet(`${base}/word/${hotSeat}`, text.trim())
    return (
      <div className="text-center">
        <p className="font-bold" style={{ color: 'var(--c-grape)' }}>✍️ {nameOf(hotSeat)}의 이마 단어를 써주세요</p>
        <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ink-soft)' }}>주제: {catLabel(cfg?.category)} · 본인 못 보게!</p>
        <input value={text} onChange={(e) => setText(e.target.value)} className="w-full clay-inset px-4 py-4 text-xl text-center" placeholder={`${nameOf(hotSeat)}에게 줄 단어`} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim()}>제출</Button>
      </div>
    )
  }

  // 레이스/결과 — 이미 맞힘
  if (myOrder) {
    const medal = myOrder === 1 ? '🥇 1등!' : `${myOrder}등`
    return <div className="text-center py-10 clay" style={{ background: myOrder === 1 ? 'var(--c-mint)' : 'var(--surface)', color: myOrder === 1 ? '#fff' : 'var(--ink)' }}><div className="text-5xl">{myOrder === 1 ? '🥇' : '✅'}</div><p className="mt-2 font-display text-2xl">우리 파드 {medal}</p><p className="mt-1 text-sm opacity-90">정답: {myWord}</p></div>
  }

  // 핫시트 — 못 보고 맞히기
  if (amHot) {
    if (phase === 'result') {
      return <div className="text-center py-10"><div className="text-5xl">🙈</div><p className="mt-2 font-display text-xl">못 맞혔어요… 정답: {myWord}</p></div>
    }
    const gotIt = () => dbTransaction(`${base}/done`, (cur) => { cur = cur || {}; if (cur[podIdx] != null) return; cur[podIdx] = Object.keys(cur).length + 1; return cur })
    return (
      <div className="text-center">
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>힌트 주는 팀원: {mates.join(', ')}</p>
        <div className="clay p-6 mt-2" style={{ background: 'var(--surface-2)' }}>
          <div className="font-display text-5xl">❓</div>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>내 이마 단어는 비밀! 팀원 힌트 듣고 맞혀봐</p>
        </div>
        <Button className="mt-4 w-full text-2xl py-4" style={{ background: 'var(--c-mint)', color: '#fff' }} onClick={gotIt}>✅ 맞혔다!</Button>
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>정답을 외치고 이 버튼을 누르면 우리 파드 기록!</p>
      </div>
    )
  }

  // 힌트 주는 팀원 — 핫시트 단어 보임
  return (
    <div className="text-center">
      <div className="clay p-5 mt-2" style={{ background: 'var(--c-coral)', color: '#fff' }}>
        <div className="opacity-90">🎯 {nameOf(hotSeat)}에게 힌트!</div>
        <div className="font-display text-4xl mt-1">{myWord || '…'}</div>
        <div className="mt-2 text-sm opacity-90"><b>이름·단어 직접 말 금지</b> 🤐 · 설명으로 맞히게!</div>
      </div>
      <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>우리 파드({podIdx + 1})가 먼저 맞히면 승! 🏁</p>
    </div>
  )
}

export default {
  id: 'callmyname',
  name: '양세찬 게임',
  emoji: '🃏',
  tagline: '파드 스피드 · 팀원 힌트로 먼저 맞히기',
  genres: ['party', 'brain'],
  traits: ['team'],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
