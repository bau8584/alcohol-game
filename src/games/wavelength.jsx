// 웨이브렝스 — 스펙트럼 위 '비밀 지점'을 출제자가 단어 힌트로 설명, 나머지가 바에서 맞힌다.
// 출제자가 타깃을 직접 지정(자유) · 3단 존 판정(🎯완벽/👍근접/😅아슬/밖=벌칙) · 존 폭은 호스트가 조절.
// 출제자 양쪽 벌칙: 적중 0명(설명 못함) 또는 전원 적중(너무 쉽게 냄) → 출제자가 마심. '적당히 어렵게'가 최적해.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList } from '../lib/db'
import { Button } from '../components/ui'

// 스펙트럼 기준: '한 줄로 세울 수 있는 명확한 1차원 축'. 아무거나 올려놓고 위치를 가늠할 수 있어야
// 출제자가 힌트를 내기 쉽고 참가자도 예측이 된다. (추상적·도덕적 축은 난해해서 뺐다)
const SPECTRA = [
  ['작다', '크다'], ['싸다', '비싸다'], ['가볍다', '무겁다'],
  ['느리다', '빠르다'], ['짧다', '길다'], ['차갑다', '뜨겁다'],
  ['안 맵다', '개맵다'], ['안 달다', '엄청 달다'], ['조용하다', '시끄럽다'],
  ['어둡다', '밝다'], ['안 유명', '완전 유명'], ['흔하다', '희귀하다'],
  ['구식', '최신'], ['촌스럽다', '세련되다'], ['쓸모없다', '필수템'],
  ['건강에 나쁨', '건강에 좋음'], ['안 위험', '치명적'], ['가성비 나쁨', '가성비 갑'],
  ['쉽다', '어렵다'], ['편하다', '힘들다'], ['유치하다', '어른스럽다'],
  ['안 귀엽다', '개귀엽다'], ['안 무섭다', '개무섭다'], ['노잼', '꿀잼'],
  ['안 부럽다', '개부럽다'], ['평범하다', '특이하다'], ['안 중독성', '개중독성'],
  ['안 느끼함', '느끼함 폭발'], ['순하다', '독하다'], ['오래됨', '새것'],
]

// 🔞 19금 스펙트럼 (19금 토글 ON일 때만) — 마찬가지로 '한 줄로 세울 수 있는' 축으로
const ADULT_SPECTRA = [
  ['안 야하다', '개야하다'], ['순수하다', '밝힌다'], ['건전하다', '문란하다'],
  ['플라토닉', '에로틱'], ['얌전하다', '과감하다'], ['초보', '선수'],
  ['안 섹시', '완전 섹시'], ['보수적', '개방적'], ['금욕', '밝힘'],
  ['은은하다', '자극적이다'], ['소극적', '적극적'], ['안전한 취향', '위험한 취향'],
  ['첫 경험 전', '경험 만렙'], ['금방 끝', '밤새도록'], ['조용한 밤', '시끄러운 밤'],
  ['얌전한 손', '못 참는 손'], ['불 꺼야 함', '불 켜도 OK'], ['천사', '침대 위 악마'],
]

// 출제자용 랜덤 힌트 단어 — 이 단어가 스펙트럼 축에서 '어디쯤'인지 지점을 잡는 데 쓴다.
const HINT_WORDS = [
  '코끼리', '스타벅스', '지하철', '라면', '김치', '에베레스트', '개미', '다이아몬드', '편의점', '초등학생',
  '삼겹살', '우주', '모기', '아이폰', '김연아', '로또', '바퀴벌레', '텀블러', '히말라야', '종이컵',
  '페라리', '붕어빵', '화장지', '고래', '참기름', '인공지능', '손흥민', '소금', '우산', '신라면',
  '벽돌', '깃털', '태양', '얼음', '라이터', '금괴', '젤리', '헬리콥터', '달팽이', '번지점프',
]

// 존 폭 — 적중(안전) 경계 e, 그 안에서 완벽 p / 근접 c
const ZONES = {
  narrow: { key: 'narrow', label: '좁게', p: 3, c: 6, e: 10 },
  normal: { key: 'normal', label: '보통', p: 5, c: 10, e: 16 },
  wide: { key: 'wide', label: '넓게', p: 8, c: 16, e: 25 },
}
const zoneOf = (k) => ZONES[k] || ZONES.normal
const verdictOf = (err, z) =>
  err <= z.p ? { label: '🎯 완벽!', color: 'var(--c-mint)', hit: true }
  : err <= z.c ? { label: '👍 근접', color: 'var(--c-sky)', hit: true }
  : err <= z.e ? { label: '😅 아슬', color: 'var(--c-lemon)', hit: true }
  : { label: '🍺 벌칙', color: 'var(--c-coral)', hit: false }

// 스펙트럼 바 — 존 밴드 + 정답선 + 마커를 한 곳에서 그림
function SpectrumBar({ spec, target, zone, showZone, markers = [], height = 'h-14' }) {
  const z = zoneOf(zone)
  const band = (w, color) =>
    target == null ? null : (
      <div className="absolute top-0 h-full" style={{ left: `${Math.max(0, target - w)}%`, width: `${Math.min(100, target + w) - Math.max(0, target - w)}%`, background: color }} />
    )
  return (
    <>
      <div className={`relative ${height} clay-inset max-w-lg mx-auto overflow-hidden`} style={{ background: 'linear-gradient(90deg, var(--surface-2), var(--c-sky))' }}>
        {showZone && (
          <>
            {band(z.e, 'rgba(255,255,255,0.25)')}
            {band(z.c, 'rgba(255,255,255,0.35)')}
            {band(z.p, 'rgba(255,255,255,0.55)')}
          </>
        )}
        {showZone && target != null && (
          <div className="absolute top-0 h-full w-1 rounded" style={{ left: `${target}%`, background: 'var(--c-coral)' }} />
        )}
        {markers.map((m) => (
          <div key={m.key} className="absolute -top-0.5 flex flex-col items-center" style={{ left: `calc(${m.value}% - 9px)` }}>
            <span className="text-lg leading-none">📍</span>
            {m.name && <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'var(--ink)' }}>{m.name}</span>}
          </div>
        ))}
      </div>
      <div className="flex justify-between max-w-lg mx-auto text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
        <span>{spec?.l}</span><span>{spec?.r}</span>
      </div>
    </>
  )
}

function HostView({ base, meta, players }) {
  const spec = useValue(`${base}/spectrum`)
  const masterId = useValue(`${base}/masterId`)
  const target = useValue(`${base}/target`)
  const clue = useValue(`${base}/clue`)
  const zone = useValue(`${base}/zone`) || 'normal'
  const guessRaw = useValue(`${base}/guess`)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'
  const z = zoneOf(zone)

  // 출제자 선택 — 스펙트럼·지점·힌트는 전부 출제자가 폰에서 정한다(진행자는 누가 낼지만 고름)
  const pickMaster = (pid) => dbUpdate(base, { masterId: pid, spectrum: null, target: null, clue: null, guess: null })
  const randomMaster = () => { if (players.length) pickMaster(players[Math.floor(Math.random() * players.length)].id) }

  const guesses = toList(guessRaw).filter((g) => typeof g.value === 'number' && g.id !== masterId)
  const scored = useMemo(() => {
    if (target == null) return []
    return guesses.map((g) => ({ ...g, err: Math.abs(g.value - target), name: byId[g.id]?.nickname || '?' }))
      .map((g) => ({ ...g, v: verdictOf(g.err, z) }))
      .sort((a, b) => a.err - b.err)
  }, [guesses, target, z, byId])
  const hits = scored.filter((g) => g.v.hit)
  const masterDrinks = scored.length > 0 && (hits.length === 0 || hits.length === scored.length)
  const masterReason = hits.length === 0 ? '아무도 못 맞힘 · 설명 실패' : '전원 적중 · 너무 쉽게 냄'

  return (
    <div className="text-center">
      {staged && (
        <div className="mb-4 max-w-lg mx-auto">
          <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>출제자를 고르세요 · 스펙트럼·지점·힌트는 <b>출제자가 폰에서</b> 직접 정합니다</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {players.map((p) => (
              <button key={p.id} onClick={() => pickMaster(p.id)} className="clay-btn px-3 py-1.5 text-sm font-display" style={masterId === p.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
            ))}
          </div>
          <button onClick={randomMaster} disabled={!players.length} className="clay-btn mt-2 px-5 py-2 font-display disabled:opacity-40" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 랜덤 출제자</button>
          {masterId && <p className="mt-2 text-sm" style={{ color: 'var(--c-sky)' }}>🎯 {byId[masterId]?.nickname} 님이 폰에서 스펙트럼·지점·힌트를 정합니다 · ‘시작’을 누르세요</p>}
        </div>
      )}

      {!staged && (
        <div className="font-display text-2xl">
          {spec ? <>{spec.l} <span style={{ color: 'var(--ink-soft)' }}>↔</span> {spec.r}</> : <span style={{ color: 'var(--ink-soft)' }}>출제자가 스펙트럼 뽑는 중…</span>}
        </div>
      )}

      {!staged && (
        <>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
            출제자: <b style={{ color: 'var(--ink)' }}>{byId[masterId]?.nickname || '?'}</b> · 존 {z.label}(±{z.e})
          </div>
          {clue ? <div className="mt-1 font-display text-3xl" style={{ color: 'var(--c-sky)' }}>“{clue}”</div>
                : <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>출제자가 지점·힌트 정하는 중…</div>}

          <div className="mt-4">
            <SpectrumBar
              spec={spec} target={target} zone={zone} showZone={reveal}
              markers={scored.map((g) => ({ key: g.id, value: g.value, name: reveal ? g.name : null }))}
            />
          </div>

          {reveal ? (
            <>
              <div className="mt-3 font-display text-xl" style={{ color: 'var(--c-coral)' }}>정답 {target} · 적중 {hits.length}/{scored.length}</div>
              {masterDrinks && (
                <div className="mt-2 clay inline-block px-4 py-2 font-display animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
                  🍺 출제자 {byId[masterId]?.nickname} 벌칙! <span className="text-sm opacity-90">({masterReason})</span>
                </div>
              )}
              <div className="mt-3 max-w-md mx-auto space-y-1">
                {scored.map((g) => (
                  <div key={g.id} className="clay-inset px-3 py-1.5 flex justify-between items-center text-sm" style={{ background: g.v.color, color: '#fff' }}>
                    <span className="font-bold">{g.name}</span>
                    <span>{g.value} · 오차 {g.err} · {g.v.label}</span>
                  </div>
                ))}
                {!scored.length && <p className="py-4" style={{ color: 'var(--ink-soft)' }}>추측이 없어요.</p>}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{guesses.length}/{Math.max(0, players.length - 1)} 추측 · 👁 ‘공개’로 정답 확인</p>
          )}
        </>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const spec = useValue(`${base}/spectrum`)
  const masterId = useValue(`${base}/masterId`)
  const target = useValue(`${base}/target`)
  const clue = useValue(`${base}/clue`)
  const zone = useValue(`${base}/zone`) || 'normal'
  const myGuess = useValue(`${base}/guess/${me.id}`)
  const [val, setVal] = useState(50)
  const [tVal, setTVal] = useState(50)
  const [clueText, setClueText] = useState('')
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const z = zoneOf(zone)

  if (!masterId) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자가 출제자를 정하는 중… 🌈</p>

  const rollSpec = (arr) => { const [l, r] = arr[Math.floor(Math.random() * arr.length)]; dbSet(`${base}/spectrum`, { l, r }) }
  const rollHint = () => setClueText(HINT_WORDS[Math.floor(Math.random() * HINT_WORDS.length)])

  // ── 출제자: 스펙트럼 뽑기 → 비밀 지점 + 힌트 (전권) ──
  if (masterId === me.id) {
    // 아직 스펙트럼 없음 → 출제자가 직접 뽑기
    if (!spec) {
      return (
        <div className="text-center py-6">
          <div className="text-5xl">🎯</div>
          <p className="font-display text-xl mt-2">당신이 출제자!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>스펙트럼을 뽑아 시작하세요</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => rollSpec(SPECTRA)} className="clay-btn px-5 py-3 text-lg font-display" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 스펙트럼 뽑기</button>
            {meta.adultEnabled && <button onClick={() => rollSpec(ADULT_SPECTRA)} className="clay-btn px-5 py-3 text-lg font-display" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
          </div>
        </div>
      )
    }
    const shown = target ?? tVal
    return (
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="font-display" style={{ color: 'var(--ink-soft)' }}>{spec.l} ↔ {spec.r}</p>
          <button onClick={() => rollSpec(SPECTRA)} disabled={reveal} className="clay-btn px-2 py-1 text-sm" title="스펙트럼 다시 뽑기" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>🎲</button>
          {meta.adultEnabled && <button onClick={() => rollSpec(ADULT_SPECTRA)} disabled={reveal} className="clay-btn px-2 py-1 text-sm" title="19금 랜덤" style={{ background: '#e64545', color: '#fff' }}>🔞</button>}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--c-sky)' }}>🤫 이 지점은 당신만 봅니다 · 존 {z.label}(±{z.e})</p>
        <div className="mt-3">
          <SpectrumBar spec={spec} target={shown} zone={zone} showZone />
        </div>
        <input type="range" min="0" max="100" value={shown} disabled={reveal}
          onChange={(e) => { const v = +e.target.value; setTVal(v); dbSet(`${base}/target`, v) }} className="w-full mt-3" />
        <div className="font-display text-4xl">{shown}</div>
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>너무 쉬운 데(0·100) 고르면 다 맞혀서 <b>내가</b> 마셔요 🍺</p>

        <div className="flex gap-2 mt-3">
          <input value={clueText} onChange={(e) => setClueText(e.target.value)} disabled={reveal} placeholder="이 지점을 단어 하나로 설명!" className="clay-inset flex-1 min-w-0 px-4 py-3 text-center" />
          <button onClick={rollHint} disabled={reveal} className="clay-btn px-3 text-xl shrink-0" title="랜덤 단어 뽑기" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲</button>
        </div>
        <Button className="mt-2 w-full" onClick={() => clueText.trim() && dbSet(`${base}/clue`, clueText.trim())} disabled={reveal || !clueText.trim()}>{clue ? '힌트 수정' : '힌트 제출'}</Button>
        {clue && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: “{clue}”</p>}
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>💡 🎲로 랜덤 단어를 뽑아, 그 단어가 이 축에서 어디쯤인지 지점을 잡아도 돼요</p>
      </div>
    )
  }

  // ── 추측자: 스펙트럼 준비 전 대기 ──
  if (!spec) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>출제자가 스펙트럼을 뽑는 중… 🌈</p>

  // ── 추측자: 공개 후 즉시 판정 ──
  if (reveal) {
    const err = myGuess != null ? Math.abs(myGuess - target) : null
    const v = err == null ? { label: '미제출 😴', color: 'var(--surface-2)' } : verdictOf(err, z)
    return (
      <div className="text-center">
        <div className="py-6 clay" style={{ background: v.color, color: '#fff' }}>
          <div className="opacity-80">정답 {target} · 내 추측 {myGuess ?? '-'}</div>
          <div className="font-display text-5xl mt-1">{err != null ? `오차 ${err}` : '-'}</div>
          <div className="mt-1 text-3xl font-display">{v.label}</div>
        </div>
        <div className="mt-3">
          <SpectrumBar spec={spec} target={target} zone={zone} showZone markers={myGuess != null ? [{ key: 'me', value: myGuess, name: '나' }] : []} />
        </div>
      </div>
    )
  }

  // ── 추측자: 추측 ──
  return (
    <div className="text-center">
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{spec.l} ↔ {spec.r}</p>
      {clue ? <div className="font-display text-2xl my-2" style={{ color: 'var(--c-sky)' }}>“{clue}”</div>
            : <p className="my-3" style={{ color: 'var(--ink-soft)' }}>출제자의 힌트 대기 중…</p>}
      <div className="mt-2">
        <SpectrumBar spec={spec} target={null} zone={zone} showZone={false} markers={[{ key: 'me', value: val }]} />
      </div>
      <input type="range" min="0" max="100" value={val} onChange={(e) => setVal(+e.target.value)} disabled={!open || !clue} className="w-full mt-3" />
      <div className="font-display text-4xl">{val}</div>
      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>정답 ±{z.e} 안에 들어야 안전 🍺</p>
      <Button className="mt-2 w-full" onClick={() => dbSet(`${base}/guess/${me.id}`, val)} disabled={!open || !clue}>{myGuess != null ? '추측 수정' : '여기로 제출'}</Button>
      {myGuess != null && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출: {myGuess}</p>}
    </div>
  )
}

export default {
  id: 'wavelength',
  name: '웨이브렝스',
  emoji: '🌈',
  tagline: '스펙트럼 지점 맞히기 · 존 안에 들면 안전',
  genres: ['telepathy', 'brain'],
  traits: ['solo'],
  controls: { prompt: false },
  HostView,
  PlayerView,
}
