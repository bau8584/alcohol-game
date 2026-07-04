// 랜덤 뽑기 — 두 모드.
//  · 뽑기: 참가자 중 N명을 무작위로 (술래/벌칙 등)
//  · 순위: 무작위 순번 매기기 (술 순서 정할 때 가위바위보 대체). 팀별 또는 전체.
import { useEffect, useRef, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction } from '../lib/db'
import { Button } from '../components/ui'

const MISSIONS = ['🍺 원샷', '🍺 한 잔', '🎤 노래', '💃 춤', '😘 뽀뽀', '🗣️ 자기소개', '🎯 다음 술래', '❓ 질문 받기', '🧹 뒷정리', '🤥 진실게임']

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const sample = (arr, n) => shuffle(arr).slice(0, n).map((p) => p.id)
const toArr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : [])

/* ───────── 호스트 ───────── */
function HostView({ base, players, teams }) {
  const N = players.length
  const mode = useValue(`${base}/mode`) || 'pick'
  const nameOf = (id) => players.find((p) => p.id === id)?.nickname || '?'
  const [rolling, setRolling] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearInterval(timer.current), [])

  return (
    <div className="text-center">
      <div className="inline-flex gap-2 clay-inset p-1.5 mb-4">
        {[
          { id: 'pick', label: '🎯 랜덤 뽑기' },
          { id: 'rank', label: '🏆 순위 뽑기' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => dbSet(`${base}/mode`, m.id)}
            className="font-display px-4 py-2 rounded-2xl"
            style={mode === m.id ? { background: 'var(--c-grape)', color: '#fff' } : { color: 'var(--ink-soft)' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'pick' ? (
        <PickHost base={base} players={players} N={N} nameOf={nameOf} rolling={rolling} setRolling={setRolling} timer={timer} />
      ) : (
        <RankHost base={base} players={players} teams={teams} nameOf={nameOf} rolling={rolling} setRolling={setRolling} timer={timer} />
      )}
    </div>
  )
}

/* ── 뽑기 모드 ── */
function PickHost({ base, players, N, nameOf, rolling, setRolling, timer }) {
  const rawCount = useValue(`${base}/count`)
  const count = Math.max(1, Math.min(N || 1, rawCount || 1))
  const mission = useValue(`${base}/mission`) || ''
  const picked = toArr(useValue(`${base}/picked`))
  const [flash, setFlash] = useState([])
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
  const show = rolling ? flash : picked

  return (
    <>
      <input value={mission} onChange={(e) => dbSet(`${base}/mission`, e.target.value)} placeholder="목적을 정해도 되고, 안 정해도 돼요 (예: 원샷!)" className="clay-inset w-full max-w-md mx-auto block px-4 py-2.5 text-center" />
      <div className="mt-2 flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto">
        {MISSIONS.map((m) => (
          <button key={m} onClick={() => dbSet(`${base}/mission`, m)} className="clay-btn px-2.5 py-1 text-sm" style={mission === m ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{m}</button>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button onClick={() => setCount(-1)} disabled={count <= 1} className="clay-btn w-12 h-12 text-3xl font-display disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>–</button>
        <div>
          <div className="font-display text-4xl leading-none">{count}<span className="text-xl">명</span></div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>뽑을 인원</div>
        </div>
        <button onClick={() => setCount(1)} disabled={count >= N} className="clay-btn w-12 h-12 text-3xl font-display disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
      </div>
      <Button className="mt-5 w-full max-w-md mx-auto text-2xl py-4" onClick={roll} disabled={rolling || N === 0}>
        {rolling ? '두구두구… 🥁' : picked.length ? '🎰 다시 뽑기!' : '🎰 뽑기!'}
      </Button>
      {N === 0 && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</p>}
      {show.length > 0 && (
        <div className="mt-6">
          {mission && !rolling && <div className="font-display text-2xl mb-3" style={{ color: 'var(--c-coral)' }}>{mission}</div>}
          <div className="flex flex-wrap justify-center gap-3">
            {show.map((id) => (
              <span key={id} className={`clay px-5 py-3 font-display text-2xl ${rolling ? '' : 'animate-pop'}`} style={{ background: rolling ? 'var(--surface-2)' : 'var(--c-grape)', color: rolling ? 'var(--ink-soft)' : '#fff' }}>{nameOf(id)}</span>
            ))}
          </div>
          {!rolling && <button onClick={() => dbUpdate(base, { picked: null })} className="mt-4 text-sm underline" style={{ color: 'var(--ink-soft)' }}>결과 지우기</button>}
        </div>
      )}
    </>
  )
}

/* ── 순위 모드 ── */
function RankHost({ base, players, teams, nameOf, rolling, setRolling, timer }) {
  const scope = useValue(`${base}/scope`) || 'team'
  const rank = useValue(`${base}/rank`)

  const genTeam = () => teams.reduce((acc, t) => ((acc[t.id] = shuffle(t.members).map((p) => p.id)), acc), {})
  const genAll = () => shuffle(players).map((p) => p.id)

  const roll = () => {
    if (rolling || players.length === 0) return
    setRolling(true)
    let ticks = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      if (++ticks >= 12) {
        clearInterval(timer.current)
        setRolling(false)
        dbSet(`${base}/rank`, { scope, teams: genTeam(), all: genAll(), at: Date.now() })
      }
    }, 80)
  }

  return (
    <div>
      <div className="flex justify-center gap-2 mb-4">
        {[
          { id: 'team', label: '팀별 순위' },
          { id: 'all', label: '전체 순위' },
        ].map((s) => (
          <button key={s.id} onClick={() => dbSet(`${base}/scope`, s.id)} className="clay-btn font-display px-4 py-2" style={scope === s.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{s.label}</button>
        ))}
      </div>
      <Button className="w-full max-w-md mx-auto text-2xl py-4" onClick={roll} disabled={rolling || players.length === 0}>
        {rolling ? '두구두구… 🥁' : rank ? '🔀 다시 순위!' : '🏆 순위 뽑기!'}
      </Button>
      {players.length === 0 && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</p>}

      {rolling && <div className="mt-6 font-display text-4xl animate-pulse">🔀 섞는 중…</div>}

      {!rolling && rank && (
        <div className="mt-6">
          {rank.scope === 'team' ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {teams.map((t) => (
                <div key={t.id} className="clay p-3 text-left animate-pop" style={{ background: 'var(--surface)' }}>
                  <div className="font-display text-lg mb-1" style={{ color: t.color }}>{t.name}</div>
                  <ol className="space-y-1">
                    {(rank.teams?.[t.id] || []).map((id, i) => (
                      <li key={id} className="flex items-center gap-2">
                        <span className="font-display w-6 text-center rounded-md text-sm" style={{ background: t.color, color: '#fff' }}>{i + 1}</span>
                        <span className="font-bold truncate">{nameOf(id)}</span>
                      </li>
                    ))}
                    {!(rank.teams?.[t.id] || []).length && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>팀원 없음</li>}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <ol className="max-w-md mx-auto space-y-1.5 text-left animate-pop">
              {(rank.all || []).map((id, i) => (
                <li key={id} className="clay-inset flex items-center gap-3 px-4 py-2">
                  <span className="font-display text-lg w-7 text-center">{i + 1}</span>
                  <span className="font-bold">{nameOf(id)}</span>
                </li>
              ))}
            </ol>
          )}
          <button onClick={() => dbUpdate(base, { rank: null })} className="mt-4 text-sm underline" style={{ color: 'var(--ink-soft)' }}>결과 지우기</button>
        </div>
      )}
    </div>
  )
}

/* ───────── 플레이어 ───────── */
function PlayerView({ base, me }) {
  const mode = useValue(`${base}/mode`) || 'pick'
  const picked = toArr(useValue(`${base}/picked`))
  const mission = useValue(`${base}/mission`) || ''
  const rank = useValue(`${base}/rank`)

  if (mode === 'rank') {
    if (!rank) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl animate-pop">🏆</div>
          <p className="mt-3 font-display text-xl">진행자가 순위 뽑는 중!</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요</p>
        </div>
      )
    }
    const list = rank.scope === 'team' ? rank.teams?.[me.teamId] || [] : rank.all || []
    const pos = list.indexOf(me.id)
    return (
      <div className="text-center py-10 clay animate-pop" style={{ background: 'var(--c-sky)', color: '#fff' }}>
        <div className="opacity-80">{rank.scope === 'team' ? '우리 팀 순번' : '전체 순번'}</div>
        <div className="font-display text-7xl mt-1">{pos >= 0 ? pos + 1 : '-'}<span className="text-3xl">번</span></div>
        {pos >= 0 && <p className="mt-2 opacity-90">{list.length}명 중 {pos + 1}번째</p>}
      </div>
    )
  }

  if (!picked.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl animate-pop">🎰</div>
        <p className="mt-3 font-display text-xl">두구두구… 진행자가 뽑는 중!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요</p>
      </div>
    )
  }
  if (picked.includes(me.id)) {
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
  tagline: '무작위 뽑기 · 팀별 순위',
  genres: ['party'],
  traits: [],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
