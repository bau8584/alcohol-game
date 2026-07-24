// 양세찬 게임 (팀전) — 팀마다 이마 단어 1개.
// 자기 팀 단어는 우리 팀만 못 봄(❓), 다른 팀은 다 보임 → 다른 팀에게 예/아니오 물어 우리 팀 단어 맞히기.
// 단어는 프리셋 랜덤 or '상대팀이 써주기'. 진행자가 맞힌 팀을 ✅ 체크 → 먼저 맞힌 순으로 순위.
// (mode:'self' — 게임이 phase를 직접 관리)
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction, dbRemove } from '../lib/db'
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

// 멤버(접속자)가 있는 팀만 · order 기준 안정 정렬
const activeTeams = (teams, players) => {
  const has = {}
  players.filter((p) => p.connected !== false && p.teamId).forEach((p) => { has[p.teamId] = true })
  return [...teams].filter((t) => has[t.id]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
// 프리셋: 각 팀에 서로 다른 단어
const assignPreset = (teamIds, bank) => {
  const deck = shuffle(bank)
  const w = {}
  teamIds.forEach((tid, i) => { w[tid] = deck[i % deck.length] })
  return w
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, meta, players, teams }) {
  const cfg = useValue(`${base}/cfg`)
  const ring = useValue(`${base}/ring`) // [teamId...] 배정 순서(상대팀 써주기 타깃 계산용)
  const tword = useValue(`${base}/tword`) || {}
  const done = useValue(`${base}/done`) || {}
  const phase = useValue(`${base}/phase`) || 'setup'

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
  const tName = (id) => teamById[id]?.name || '?'

  const [source, setSource] = useState('preset')
  const [category, setCategory] = useState('star')

  const live = activeTeams(teams, players)
  const start = () => {
    if (live.length < 2) return alert('멤버가 있는 팀이 2팀 이상 필요해요.')
    const ids = live.map((t) => t.id)
    const preset = source === 'preset'
    dbSet(base, {
      cfg: { source, category },
      ring: ids,
      tword: preset ? assignPreset(ids, bankFor(category)) : null,
      done: null,
      phase: preset ? 'play' : 'write',
    })
  }
  const rematch = () => {
    const ids = ring || live.map((t) => t.id)
    const preset = cfg?.source === 'preset'
    dbUpdate(base, {
      tword: preset ? assignPreset(ids, bankFor(cfg.category)) : null,
      done: null,
      phase: preset ? 'play' : 'write',
    })
  }

  const ids = ring || live.map((t) => t.id)
  const writtenCount = ids.filter((id) => tword[id]).length
  const doneCount = Object.keys(done).length

  // ── 셋업 ──
  if (phase === 'setup' || !ring) {
    return (
      <div className="text-center">
        <p className="font-display text-lg">🃏 양세찬 게임 (팀전)</p>
        <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          팀마다 이마 단어 1개! <b>우리 팀 단어는 우리만 못 보고</b>, 다른 팀에게 예/아니오 물어 맞혀요.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {[['preset', '📋 프리셋 단어'], ['write', '✍️ 상대팀이 써주기']].map(([k, l]) => (
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
          {source === 'write' && <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>상대팀이 써주기 모드: 주제는 작성 가이드로만 쓰여요</p>}
        </div>

        <div className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
          참여 팀 {live.length}팀: {live.map((t) => t.name).join(' · ') || '없음'}
        </div>
        <Button className="mt-4 text-xl px-8 py-3" onClick={start} disabled={live.length < 2}>🚀 단어 배정하고 시작</Button>
      </div>
    )
  }

  // ── 팀 보드 — 공용/진행자 화면이라 단어는 결과 전까지 절대 안 띄운다(각 팀이 자기 단어 볼까 봐).
  const showWords = phase === 'result'
  const board = (
    <>
      {!showWords && <p className="text-xs mt-3" style={{ color: 'var(--ink-soft)' }}>🔒 단어는 각자 폰에만 · 이 화면엔 안 띄워요</p>}
      <div className="mt-2 grid gap-2 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {ids.map((id) => {
          const order = done[id]
          const medal = order === 1 ? '🥇' : order === 2 ? '🥈' : order === 3 ? '🥉' : order ? `${order}등` : null
          const t = teamById[id]
          const written = !!tword[id]
          return (
            <div key={id} className="clay-inset p-3 text-left" style={order === 1 ? { outline: '2px solid var(--c-mint)' } : {}}>
              <div className="flex justify-between items-center">
                <span className="font-display" style={{ color: t?.color }}>{tName(id)}</span>
                {medal && <span className="font-display">{medal}</span>}
              </div>
              <div className="mt-1 font-display text-lg" style={{ color: showWords ? 'var(--c-coral)' : 'var(--ink-soft)' }}>
                {showWords
                  ? (tword[id] || '—')
                  : phase === 'write'
                    ? (written ? '작성 완료 ✅' : '작성 대기…')
                    : (order ? '맞힘 ✅' : '🧠 단어 숨김')}
              </div>
              {phase === 'play' && (
                order ? (
                  <button onClick={() => dbTransaction(`${base}/done`, (cur) => { cur = cur || {}; delete cur[id]; return cur })} className="mt-2 text-xs underline" style={{ color: 'var(--ink-soft)' }}>맞힘 취소 ↩</button>
                ) : (
                  <button onClick={() => dbTransaction(`${base}/done`, (cur) => { cur = cur || {}; if (cur[id] != null) return; cur[id] = Object.keys(cur).length + 1; return cur })} className="clay-btn mt-2 w-full py-1.5 text-sm font-display" style={{ background: 'var(--c-mint)', color: '#fff' }}>✅ 맞힘</button>
                )
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  // ── 작성 대기 (상대팀이 써주기) ──
  if (phase === 'write') {
    return (
      <div className="text-center">
        <p className="font-display text-lg">✍️ 상대팀이 단어 써주는 중… ({writtenCount}/{ids.length})</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제: {catLabel(cfg?.category)} · 각 팀은 지정된 상대팀 단어를 정해줘요</p>
        {board}
        <Button className="mt-4" onClick={() => dbUpdate(base, { phase: 'play' })} disabled={writtenCount < ids.length}>
          {writtenCount < ids.length ? `아직 ${ids.length - writtenCount}팀 남음` : '▶ 시작!'}
        </Button>
      </div>
    )
  }

  // ── 진행 ──
  if (phase === 'play') {
    return (
      <div className="text-center">
        <p className="font-display text-xl">🏁 우리 팀 단어를 맞혀라!</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>맞힌 팀 {doneCount}/{ids.length} · 맞히면 ✅ 눌러 순위 기록</p>
        {board}
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="warn" onClick={() => dbUpdate(base, { phase: 'result' })}>🏁 결과 보기</Button>
        </div>
      </div>
    )
  }

  // ── 결과 ──
  const ranking = ids.map((id) => ({ id, order: done[id] || 999 })).sort((a, b) => a.order - b.order)
  const winner = ranking.find((r) => r.order === 1)
  return (
    <div className="text-center">
      <p className="font-display text-2xl">🏆 결과</p>
      {winner ? <p className="mt-1 font-display text-xl" style={{ color: teamById[winner.id]?.color || 'var(--c-mint)' }}>🥇 {tName(winner.id)} 승리!</p> : <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>아무 팀도 못 맞혔어요 🥲</p>}
      {board}
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="primary" onClick={rematch}>🔄 다시 (단어 재배정)</Button>
        <Button variant="ghost" onClick={() => dbSet(base, null)}>↩ 새 게임</Button>
      </div>
    </div>
  )
}

/* ═══════════════ 참가자 ═══════════════ */
function PlayerView({ base, players, teams, me, myTeam }) {
  const cfg = useValue(`${base}/cfg`)
  const ring = useValue(`${base}/ring`)
  const tword = useValue(`${base}/tword`) || {}
  const done = useValue(`${base}/done`) || {}
  const phase = useValue(`${base}/phase`) || 'setup'
  const [text, setText] = useState('')

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
  const tName = (id) => teamById[id]?.name || '?'
  const myTeamId = myTeam?.id || me.teamId
  const ids = Array.isArray(ring) ? ring : []

  if (phase === 'setup' || !ids.length) {
    return <div className="text-center py-12"><div className="text-5xl">🃏</div><p className="mt-3 font-display text-xl">진행자가 단어를 배정 중…</p></div>
  }
  if (!ids.includes(myTeamId)) {
    return <div className="text-center py-12"><div className="text-5xl">🃏</div><p className="mt-3 font-display text-xl">이번 판은 미참여</p><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>팀에 들어가면 참여돼요</p></div>
  }

  const myIdx = ids.indexOf(myTeamId)
  const targetId = ids[(myIdx + 1) % ids.length] // 우리 팀이 단어를 써줄 상대팀 (ring 다음 팀)
  const myOrder = done[myTeamId]
  const others = ids.filter((id) => id !== myTeamId) // 내가 볼 수 있는(내가 아는) 다른 팀 단어들

  // ── 작성 단계: 우리 팀이 targetId 팀의 단어를 정해줌 ──
  if (phase === 'write') {
    const targetWord = tword[targetId]
    if (targetWord) {
      return <div className="text-center py-12"><div className="text-5xl">✅</div><p className="mt-3 font-display text-xl">{tName(targetId)} 단어 완료!</p><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>다른 팀 작성을 기다려요</p></div>
    }
    const submit = () => text.trim() && dbSet(`${base}/tword/${targetId}`, text.trim())
    return (
      <div className="text-center">
        <p className="font-bold" style={{ color: 'var(--c-grape)' }}>✍️ 상대팀 <b style={{ color: teamById[targetId]?.color }}>{tName(targetId)}</b>의 이마 단어를 정해주세요</p>
        <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ink-soft)' }}>주제: {catLabel(cfg?.category)} · 우리 팀끼리 상의해서 하나!</p>
        <input value={text} onChange={(e) => setText(e.target.value)} className="w-full clay-inset px-4 py-4 text-xl text-center" placeholder={`${tName(targetId)}에게 줄 단어`} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim()}>제출</Button>
      </div>
    )
  }

  // ── 결과: 전체 팀 순위(게임 종료 → 전부 공개 안전) ──
  if (phase === 'result') {
    const ranking = ids.map((id) => ({ id, order: done[id] || 999 })).sort((a, b) => a.order - b.order)
    return (
      <div className="text-center">
        <p className="font-display text-2xl mb-1">🏆 결과</p>
        {myOrder && <p className="text-sm mb-2" style={{ color: myOrder === 1 ? 'var(--c-mint)' : 'var(--ink-soft)' }}>우리 팀 {myOrder === 1 ? '🥇 1등!' : `${myOrder}등`}</p>}
        <div className="max-w-md mx-auto space-y-1.5 text-left">
          {ranking.map((r, i) => {
            const t = teamById[r.id]
            const medal = r.order === 1 ? '🥇' : r.order === 2 ? '🥈' : r.order === 3 ? '🥉' : r.order === 999 ? '—' : `${r.order}등`
            return (
              <div key={r.id} className="clay-inset px-3 py-2 flex items-center gap-2" style={r.id === myTeamId ? { outline: '2px solid var(--c-mint)' } : {}}>
                <span className="font-display w-7 shrink-0">{medal}</span>
                <span className="flex-1 font-bold" style={{ color: t?.color }}>{tName(r.id)}{r.id === myTeamId ? ' (우리)' : ''}</span>
                <span className="font-display" style={{ color: 'var(--c-coral)' }}>{tword[r.id] || '—'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 우리 팀이 맞힘 ──
  if (myOrder) {
    const medal = myOrder === 1 ? '🥇 1등!' : `${myOrder}등`
    return (
      <div className="text-center py-10 clay" style={{ background: myOrder === 1 ? 'var(--c-mint)' : 'var(--surface)', color: myOrder === 1 ? '#fff' : 'var(--ink)' }}>
        <div className="text-5xl">{myOrder === 1 ? '🥇' : '✅'}</div>
        <p className="mt-2 font-display text-2xl">우리 팀 {medal}</p>
        <p className="mt-1 text-sm opacity-90">정답: {tword[myTeamId]}</p>
      </div>
    )
  }

  // ── 진행: 우리 팀 단어는 ❓ · 다른 팀 단어는 다 보임(맞히는 데 도와줄 정보) ──
  const myColor = myTeam?.color || 'var(--c-grape)'
  return (
    <div>
      {/* 우리 팀 이마 카드 */}
      <div className="clay p-6 text-center" style={{ background: myColor, color: '#fff' }}>
        <div className="text-xs opacity-90">🧠 우리 팀 이마 단어</div>
        <div className="font-display text-6xl mt-1 leading-none">❓</div>
        <p className="text-sm mt-3 opacity-90">다른 팀에게 예/아니오로 물어서 맞혀요!<br />우리 팀 단어는 아무도 안 알려줘요.</p>
      </div>

      {/* 다른 팀 이마 — 나만 보이는 정보 */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xl">🙊</span>
          <div className="min-w-0">
            <div className="font-display text-sm leading-tight">다른 팀 이마 단어</div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>나만 보여요 · 절대 티내지 마세요!</div>
          </div>
        </div>
        <div className="space-y-2">
          {others.map((id) => {
            const t = teamById[id]
            const guessed = !!done[id]
            return (
              <div key={id} className="clay flex items-stretch overflow-hidden" style={{ background: 'var(--surface)', opacity: guessed ? 0.55 : 1 }}>
                <div className="w-2 shrink-0" style={{ background: t?.color }} />
                <div className="flex-1 flex items-center justify-between gap-2 px-4 py-3">
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold" style={{ color: t?.color }}>{tName(id)}</div>
                    <div className={`font-display text-2xl truncate ${guessed ? 'line-through' : ''}`} style={{ color: guessed ? 'var(--ink-soft)' : 'var(--ink)' }}>
                      {tword[id] || '…'}
                    </div>
                  </div>
                  {guessed && (
                    <span className="clay-inset px-2.5 py-1 text-xs font-bold shrink-0" style={{ color: 'var(--c-mint)' }}>맞힘 ✅</span>
                  )}
                </div>
              </div>
            )
          })}
          {!others.length && <p className="text-center text-sm py-4" style={{ color: 'var(--ink-soft)' }}>다른 팀이 없어요.</p>}
        </div>
      </div>
    </div>
  )
}

export default {
  id: 'callmyname',
  name: '양세찬 게임',
  emoji: '🃏',
  tagline: '팀전 · 팀마다 이마 단어 1개 · 다른 팀에게 물어 맞히기',
  genres: ['party', 'brain'],
  traits: ['team'],
  controls: { mode: 'self' },
  shareResult: false, // HostView에 비밀 단어가 있어 참가자 공유 화면(SharedResult) 비활성
  HostView,
  PlayerView,
}
