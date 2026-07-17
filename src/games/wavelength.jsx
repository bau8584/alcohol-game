// 웨이브렝스 — 스펙트럼 위 '비밀 지점'을 마스터가 단어 힌트로 설명, 나머지가 바에서 맞힌다.
// 마스터가 타깃을 직접 지정(자유) · 3단 존 판정(🎯완벽/👍근접/😅아슬/밖=벌칙) · 존 폭은 호스트가 조절.
// 마스터 양쪽 벌칙: 적중 0명(설명 못함) 또는 전원 적중(너무 쉽게 냄) → 마스터가 마심. '적당히 어렵게'가 최적해.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList } from '../lib/db'
import { Button } from '../components/ui'

// 스펙트럼 기준: '진짜로 의견이 갈리는가'. 다들 비슷하게 생각하는 건 논쟁이 안 터져서 뺐다.
const SPECTRA = [
  ['솔직함', '무례함'], ['장난', '폭력'], ['실수', '범죄'],
  ['자신감', '허세'], ['절약', '궁상'], ['쿨하다', '집착'],
  ['그럴 수 있지', '인성 나감'], ['용서 가능', '손절각'],
  ['찌질하다', '멋있다'], ['오글거림', '설렘'], ['친구', '썸'],
  ['안 맵다', '개맵다'], ['안 취함', '만취'], ['가성비', '호구'],
  ['안 부럽다', '개부럽다'], ['안 위험', '죽을 수도'],
  ['평범한 취미', '변태 취미'], ['안 부끄럽다', '이불킥'],
  ['매너', '진상'], ['귀엽다', '징그럽다'], ['패션', '코스프레'],
  ['건강식', '독'], ['개노잼', '개꿀잼'], ['어른', '애'],
  ['참을 수 있다', '못 참는다'], ['현실적', '허황됨'],
  ['적당히 마심', '알코올 중독'], ['맨정신', '주사 폭발'],
  ['안 느끼함', '느끼함 폭발'], ['국룰', '오버'],
  ['호감', '부담'], ['농담', '선 넘음'],
]

// 🔞 19금 스펙트럼 (19금 토글 ON일 때만)
const ADULT_SPECTRA = [
  ['순수 그 자체', '변태'], ['안 야하다', '개야하다'],
  ['플라토닉', '에로틱'], ['보수적 스킨십', '개방적 스킨십'],
  ['한 달에 한 번', '하루 세 번'], ['모태솔로', '선수'],
  ['불 끄고만', '어디서든 스릴'], ['건전한 데이트', '모텔 직행'],
  ['친구', '섹파'], ['귀엽다', '섹시하다'],
  ['안 밝힘', '개밝힘'], ['참을 수 있음', '못 참음'],
  ['평범한 취향', '위험한 취향'], ['첫 경험도 아직', '경험 만렙'],
  ['0cm', '20cm'], ['천사표', '침대 위 악마'],
  ['숙맥', '프로'], ['금욕주의', '밝힘증'],
  ['조용한 밤', '시끄러운 밤'], ['한 번이면 충분', '밤새도록'],
  ['불 켜야 함', '무조건 불 꺼야 함'], ['정석대로', '별걸 다 시도'],
  ['혼자서도 OK', '무조건 둘이'], ['부끄럼쟁이', '노출광'],
  ['30초 컷', '기본 1시간'], ['얌전한 손', '못 참는 손'],
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

  const [el, setEl] = useState('')
  const [er, setEr] = useState('')
  const seeded = useRef(false)
  useEffect(() => { if (!seeded.current && spec) { setEl(spec.l || ''); setEr(spec.r || ''); seeded.current = true } }, [spec])
  const writeL = (v) => { setEl(v); dbSet(`${base}/spectrum`, { l: v, r: er }) }
  const writeR = (v) => { setEr(v); dbSet(`${base}/spectrum`, { l: el, r: v }) }
  const rollFrom = (arr) => { const [l, r] = arr[Math.floor(Math.random() * arr.length)]; setEl(l); setEr(r); dbSet(`${base}/spectrum`, { l, r }) }
  // 마스터 지목 — 타깃은 이제 마스터가 직접 고른다(랜덤 배정 없음)
  const pickMaster = (pid) => dbUpdate(base, { masterId: pid, target: null, clue: null, guess: null })

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
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>스펙트럼 양 극단 — 직접 쓰거나 🎲로 뽑기</div>
          <div className="flex gap-2 items-center">
            <input value={el} onChange={(e) => writeL(e.target.value)} placeholder="왼쪽 극단" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
            <span className="font-display" style={{ color: 'var(--ink-soft)' }}>↔</span>
            <input value={er} onChange={(e) => writeR(e.target.value)} placeholder="오른쪽 극단" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
          </div>
          <div className="flex gap-2 justify-center mt-2">
            <button onClick={() => rollFrom(SPECTRA)} className="clay-btn px-5 py-2 text-lg font-display" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 스펙트럼 뽑기</button>
            {meta.adultEnabled && <button onClick={() => rollFrom(ADULT_SPECTRA)} className="clay-btn px-5 py-2 text-lg font-display" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
          </div>

          {/* 존 폭 */}
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>정답 존 폭 (난이도)</div>
            <div className="flex justify-center gap-2">
              {Object.values(ZONES).map((zz) => (
                <button key={zz.key} onClick={() => dbSet(`${base}/zone`, zz.key)} className="clay-btn px-4 py-2 font-display"
                  style={zone === zz.key ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                  {zz.label} <span className="text-xs opacity-80">±{zz.e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!staged && (
        <div className="font-display text-2xl">
          {spec ? <>{spec.l} <span style={{ color: 'var(--ink-soft)' }}>↔</span> {spec.r}</> : <span style={{ color: 'var(--ink-soft)' }}>스펙트럼 미설정</span>}
        </div>
      )}

      {staged && spec && (
        <div className="mt-3">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>클루 마스터 지목 (타깃은 이 사람이 직접 고릅니다)</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {players.map((p) => (
              <button key={p.id} onClick={() => pickMaster(p.id)} className="clay-btn px-3 py-1.5 text-sm font-display" style={masterId === p.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
            ))}
          </div>
          {masterId && <p className="mt-2 text-sm" style={{ color: 'var(--c-sky)' }}>🎯 {byId[masterId]?.nickname} 님이 폰에서 지점+힌트를 정합니다 · ‘시작’ 누르세요</p>}
        </div>
      )}

      {!staged && (
        <>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
            클루 마스터: <b style={{ color: 'var(--ink)' }}>{byId[masterId]?.nickname || '?'}</b> · 존 {z.label}(±{z.e})
          </div>
          {clue ? <div className="mt-1 font-display text-3xl" style={{ color: 'var(--c-sky)' }}>“{clue}”</div>
                : <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>마스터가 지점·힌트 정하는 중…</div>}

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
                  🍺 마스터 {byId[masterId]?.nickname} 벌칙! <span className="text-sm opacity-90">({masterReason})</span>
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

  if (!spec || !masterId) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자가 준비 중… 🌈</p>

  // ── 클루 마스터: 바에서 타깃 직접 지정 + 힌트 ──
  if (masterId === me.id) {
    const shown = target ?? tVal
    return (
      <div className="text-center">
        <p className="font-display" style={{ color: 'var(--ink-soft)' }}>{spec.l} ↔ {spec.r}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--c-sky)' }}>🤫 이 지점은 당신만 봅니다 · 존 {z.label}(±{z.e})</p>
        <div className="mt-3">
          <SpectrumBar spec={spec} target={shown} zone={zone} showZone />
        </div>
        <input type="range" min="0" max="100" value={shown} disabled={!open}
          onChange={(e) => { const v = +e.target.value; setTVal(v); dbSet(`${base}/target`, v) }} className="w-full mt-3" />
        <div className="font-display text-4xl">{shown}</div>
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>너무 쉬운 데(0·100) 고르면 다 맞혀서 <b>내가</b> 마셔요 🍺</p>

        <input value={clueText} onChange={(e) => setClueText(e.target.value)} disabled={!open} placeholder="이 지점을 단어 하나로 설명!" className="clay-inset w-full mt-3 px-4 py-3 text-center" />
        <Button className="mt-2 w-full" onClick={() => clueText.trim() && dbSet(`${base}/clue`, clueText.trim())} disabled={!open || !clueText.trim()}>{clue ? '힌트 수정' : '힌트 제출'}</Button>
        {clue && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: “{clue}”</p>}
      </div>
    )
  }

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
            : <p className="my-3" style={{ color: 'var(--ink-soft)' }}>클루 마스터의 힌트 대기 중…</p>}
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
