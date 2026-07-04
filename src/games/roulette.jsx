// 랜덤 뽑기 — 아무 의미 없이 참가자 중 N명을 무작위로 뽑는다.
// 호스트가 뽑을 인원을 +/-로 정하고, 목적(술·벌칙·미션 등)은 자유롭게 붙인다.
// 두구두구 스핀 연출 후 결과를 저장 → 참가자 폰엔 '걸림/안전'이 뜬다.
import { useEffect, useRef, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction } from '../lib/db'
import { Button } from '../components/ui'

const MISSIONS = ['🍺 원샷', '🍺 한 잔', '🎤 노래', '💃 춤', '😘 뽀뽀', '🗣️ 자기소개', '🎯 다음 술래', '❓ 질문 받기', '🧹 뒷정리', '🤥 진실게임']

// 배열에서 n명 무작위 추출 (Fisher-Yates 부분 셔플)
const sample = (arr, n) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n).map((p) => p.id)
}

const toArr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : [])

/* ───────── 호스트 ───────── */
function HostView({ base, players }) {
  const N = players.length
  const rawCount = useValue(`${base}/count`)
  const count = Math.max(1, Math.min(N || 1, rawCount || 1))
  const mission = useValue(`${base}/mission`) || ''
  const picked = toArr(useValue(`${base}/picked`))

  const [rolling, setRolling] = useState(false)
  const [flash, setFlash] = useState([])
  const timer = useRef(null)
  useEffect(() => () => clearInterval(timer.current), [])

  const nameOf = (id) => players.find((p) => p.id === id)?.nickname || '?'
  // 연타해도 서버값 기준으로 원자적 증감 (비동기 왕복에도 정확히 누적)
  const setCount = (d) => dbTransaction(`${base}/count`, (cur) => Math.max(1, Math.min(N, (cur || 1) + d)))

  const roll = () => {
    if (rolling || N === 0) return
    const n = Math.min(count, N)
    setRolling(true)
    let ticks = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setFlash(sample(players, n))
      if (++ticks >= 14) {
        clearInterval(timer.current)
        setFlash([])
        setRolling(false)
        dbSet(`${base}/picked`, sample(players, n))
      }
    }, 75)
  }

  const clear = () => dbUpdate(base, { picked: null })
  const show = rolling ? flash : picked

  return (
    <div className="text-center">
      {/* 목적/미션 */}
      <input
        value={mission}
        onChange={(e) => dbSet(`${base}/mission`, e.target.value)}
        placeholder="목적을 정해도 되고, 안 정해도 돼요 (예: 원샷!)"
        className="clay-inset w-full max-w-md mx-auto block px-4 py-2.5 text-center"
      />
      <div className="mt-2 flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto">
        {MISSIONS.map((m) => (
          <button
            key={m}
            onClick={() => dbSet(`${base}/mission`, m)}
            className="clay-btn px-2.5 py-1 text-sm"
            style={mission === m ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 인원 조절 */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => setCount(-1)} disabled={count <= 1} className="clay-btn w-12 h-12 text-3xl font-display disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>–</button>
        <div>
          <div className="font-display text-4xl leading-none">{count}<span className="text-xl">명</span></div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>뽑을 인원</div>
        </div>
        <button onClick={() => setCount(1)} disabled={count >= N} className="clay-btn w-12 h-12 text-3xl font-display disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
      </div>

      {/* 뽑기 버튼 */}
      <Button className="mt-5 w-full max-w-md mx-auto text-2xl py-4" onClick={roll} disabled={rolling || N === 0}>
        {rolling ? '두구두구… 🥁' : picked.length ? '🎰 다시 뽑기!' : '🎰 뽑기!'}
      </Button>
      {N === 0 && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</p>}

      {/* 결과 */}
      {show.length > 0 && (
        <div className="mt-6">
          {mission && !rolling && <div className="font-display text-2xl mb-3" style={{ color: 'var(--c-coral)' }}>{mission}</div>}
          <div className="flex flex-wrap justify-center gap-3">
            {show.map((id) => (
              <span
                key={id}
                className={`clay px-5 py-3 font-display text-2xl ${rolling ? '' : 'animate-pop'}`}
                style={{ background: rolling ? 'var(--surface-2)' : 'var(--c-grape)', color: rolling ? 'var(--ink-soft)' : '#fff' }}
              >
                {nameOf(id)}
              </span>
            ))}
          </div>
          {!rolling && (
            <button onClick={clear} className="mt-4 text-sm underline" style={{ color: 'var(--ink-soft)' }}>결과 지우기</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────── 플레이어 ───────── */
function PlayerView({ base, me }) {
  const picked = toArr(useValue(`${base}/picked`))
  const mission = useValue(`${base}/mission`) || ''
  const iAmPicked = picked.includes(me.id)

  if (!picked.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl animate-pop">🎰</div>
        <p className="mt-3 font-display text-xl">두구두구… 진행자가 뽑는 중!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요</p>
      </div>
    )
  }

  if (iAmPicked) {
    return (
      <div className="text-center py-10 clay animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
        <div className="text-6xl">😱</div>
        <p className="mt-2 font-display text-3xl">걸렸다!</p>
        {mission && <p className="mt-2 font-display text-2xl">{mission}</p>}
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="text-6xl">😌</div>
      <p className="mt-2 font-display text-2xl">이번엔 안전!</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>뽑힌 {picked.length}명은 메인 화면에 🎯</p>
    </div>
  )
}

export default {
  id: 'roulette',
  name: '랜덤 뽑기',
  emoji: '🎰',
  tagline: '아무나 무작위로 · 인원 조절',
  genres: ['party'],
  traits: [],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
