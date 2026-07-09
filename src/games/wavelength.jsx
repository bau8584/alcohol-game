// 웨이브렝스 — 스펙트럼(예: 안 맵다↔개맵다)의 비밀 지점을 '클루 마스터'가 단어 힌트로 설명,
// 나머지가 슬라이더로 그 지점을 맞힌다. 가까울수록 고득점. (비밀 타깃 전송 = 웹 고유)
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList } from '../lib/db'
import { Button } from '../components/ui'

const SPECTRA = [
  ['안 맵다', '개맵다'], ['최악의 영화', '인생 영화'], ['쓸모없다', '필수템'],
  ['오글거린다', '설렌다'], ['싸다', '비싸다'], ['조용한', '시끄러운'],
  ['안 취함', '만취'], ['평범하다', '특이하다'], ['비호감', '호감'],
  ['현실적', '낭만적'], ['별로다', '최고다'], ['안 위험', '개위험'],
  ['찐따같다', '멋지다'], ['금방 질림', '평생 못 질림'],
]
const rnd = () => 5 + Math.floor(Math.random() * 91) // 5~95

function HostView({ base, meta, players }) {
  const spec = useValue(`${base}/spectrum`)
  const masterId = useValue(`${base}/masterId`)
  const target = useValue(`${base}/target`)
  const clue = useValue(`${base}/clue`)
  const guessRaw = useValue(`${base}/guess`)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'

  const rollSpec = () => { const [l, r] = SPECTRA[Math.floor(Math.random() * SPECTRA.length)]; dbSet(`${base}/spectrum`, { l, r }) }
  const pickMaster = (pid) => dbUpdate(base, { masterId: pid, target: rnd(), clue: null, guess: null })
  const guesses = toList(guessRaw).filter((g) => typeof g.value === 'number')

  return (
    <div className="text-center">
      {staged && (
        <div className="mb-3">
          <button onClick={rollSpec} className="clay-btn px-6 py-2 text-lg font-display" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 스펙트럼 뽑기</button>
        </div>
      )}

      <div className="font-display text-2xl">
        {spec ? <>{spec.l} <span style={{ color: 'var(--ink-soft)' }}>↔</span> {spec.r}</> : <span style={{ color: 'var(--ink-soft)' }}>스펙트럼을 뽑으세요</span>}
      </div>

      {staged && spec && (
        <div className="mt-3">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>클루 마스터 지목 (비밀 지점을 설명할 사람)</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {players.map((p) => (
              <button key={p.id} onClick={() => pickMaster(p.id)} className="clay-btn px-3 py-1.5 text-sm font-display" style={masterId === p.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
            ))}
          </div>
          {masterId && <p className="mt-2 text-sm" style={{ color: 'var(--c-sky)' }}>🎯 {byId[masterId]?.nickname} 님 폰에만 비밀 지점 전송됨 · ‘시작’ 누르세요</p>}
        </div>
      )}

      {!staged && (
        <>
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>클루 마스터: <b style={{ color: 'var(--ink)' }}>{byId[masterId]?.nickname || '?'}</b></div>
          {clue && <div className="mt-1 font-display text-3xl" style={{ color: 'var(--c-sky)' }}>“{clue}”</div>}
          {/* 스펙트럼 바 */}
          <div className="mt-4 relative h-14 clay-inset max-w-lg mx-auto" style={{ background: 'linear-gradient(90deg, var(--surface-2), var(--c-sky))' }}>
            {reveal && (
              <div className="absolute top-0 h-full w-1.5 rounded" style={{ left: `${target}%`, background: 'var(--c-coral)' }} title="정답" />
            )}
            {guesses.map((g) => (
              <div key={g.id} className="absolute -top-1 flex flex-col items-center" style={{ left: `calc(${g.value}% - 10px)` }}>
                <span className="text-lg">📍</span>
                {reveal && <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--ink)' }}>{byId[g.id]?.nickname}</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-lg mx-auto text-sm mt-1" style={{ color: 'var(--ink-soft)' }}><span>{spec?.l}</span><span>{spec?.r}</span></div>

          {reveal ? (
            <div className="mt-4 max-w-md mx-auto space-y-1">
              <div className="font-display text-xl" style={{ color: 'var(--c-coral)' }}>정답: {target}점 위치</div>
              {[...guesses].sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target)).map((g) => (
                <div key={g.id} className="clay-inset px-3 py-1.5 flex justify-between text-sm">
                  <span className="font-bold">{byId[g.id]?.nickname}</span>
                  <span>{100 - Math.abs(g.value - target)}점 <span style={{ color: 'var(--ink-soft)' }}>(오차 {Math.abs(g.value - target)})</span></span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{guesses.length}/{players.length - 1} 추측 · 👁 ‘공개’로 정답 확인</p>
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
  const myGuess = useValue(`${base}/guess/${me.id}`)
  const [val, setVal] = useState(50)
  const [clueText, setClueText] = useState('')
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'

  if (!spec || !masterId) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>진행자가 준비 중… 🌈</p>

  // 클루 마스터
  if (masterId === me.id) {
    return (
      <div className="text-center">
        <p style={{ color: 'var(--ink-soft)' }}>{spec.l} ↔ {spec.r}</p>
        <div className="clay p-5 mt-2" style={{ background: 'var(--c-sky)', color: '#fff' }}>
          <div className="opacity-80">🤫 비밀 지점 (당신만 봄)</div>
          <div className="font-display text-5xl mt-1">{target}</div>
          <div className="text-sm opacity-90 mt-1">{spec.l} 0 ~ 100 {spec.r}</div>
        </div>
        <input value={clueText} onChange={(e) => setClueText(e.target.value)} disabled={!open} placeholder="이 지점을 단어 하나로 설명!" className="clay-inset w-full mt-3 px-4 py-3 text-center" />
        <Button className="mt-2 w-full" onClick={() => clueText.trim() && dbSet(`${base}/clue`, clueText.trim())} disabled={!open || !clueText.trim()}>{clue ? '힌트 수정' : '힌트 제출'}</Button>
        {clue && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: “{clue}”</p>}
      </div>
    )
  }

  // 추측자
  if (reveal) {
    return (
      <div className="text-center py-6 clay" style={{ background: 'var(--c-grape)', color: '#fff' }}>
        <div className="opacity-80">내 추측 {myGuess ?? '-'} · 정답 {target}</div>
        <div className="font-display text-5xl mt-1">{myGuess != null ? 100 - Math.abs(myGuess - target) : 0}점</div>
      </div>
    )
  }
  return (
    <div className="text-center">
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{spec.l} ↔ {spec.r}</p>
      {clue ? <div className="font-display text-2xl my-2" style={{ color: 'var(--c-sky)' }}>“{clue}”</div> : <p className="my-3" style={{ color: 'var(--ink-soft)' }}>클루 마스터의 힌트 대기 중…</p>}
      <input type="range" min="0" max="100" value={val} onChange={(e) => setVal(+e.target.value)} disabled={!open} className="w-full" />
      <div className="font-display text-4xl">{val}</div>
      <Button className="mt-2 w-full" onClick={() => dbSet(`${base}/guess/${me.id}`, val)} disabled={!open || !clue}>{myGuess != null ? '추측 수정' : '여기로 제출'}</Button>
      {myGuess != null && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출: {myGuess}</p>}
    </div>
  )
}

export default {
  id: 'wavelength',
  name: '웨이브렝스',
  emoji: '🌈',
  tagline: '스펙트럼 지점 맞히기 · 협동',
  genres: ['telepathy', 'brain'],
  traits: ['solo'],
  controls: { prompt: false },
  HostView,
  PlayerView,
}
