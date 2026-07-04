// 연타 레이싱 — 팀전(팀별 1인당 평균) / 개인전(개인 순위) 선택. (부저에서 분리한 독립 게임)
// 게임이 시작/일시정지/계속/새 레이스를 자체 컨트롤(controls.mode='self' → 프레임워크 바 숨김).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbUpdate, dbTransaction, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const DEFAULT_SEC = 10
const MIN_SEC = 5
const MAX_SEC = 60
const MODES = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
]
const MEDALS = ['🥇', '🥈', '🥉']

function HostView({ base, players, teams }) {
  const running = useValue(`${base}/running`)
  const paused = useValue(`${base}/paused`)
  const endsAt = useValue(`${base}/endsAt`)
  const remainMs = useValue(`${base}/remainMs`)
  const raceSec = useValue(`${base}/raceSec`) || DEFAULT_SEC
  const tapRaw = useValue(`${base}/tap`)
  const mode = useValue(`${base}/mode`) || 'team'

  // 종료 시점 감지용 로컬 시계 (진행 중일 때만 tick)
  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    if (!running || paused) return
    const iv = setInterval(() => setNowTick(Date.now()), 200)
    return () => clearInterval(iv)
  }, [running, paused])

  // 팀전: 인원수 공평 보정 = 총 연타 ÷ 팀 인원 (1인당 평균)
  const teamStats = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const totals = {}
    toList(tapRaw).forEach((t) => {
      const tid = byId[t.id]?.teamId
      if (tid) totals[tid] = (totals[tid] || 0) + (t.value || 0)
    })
    const s = {}
    teams.forEach((t) => {
      const total = totals[t.id] || 0
      const n = t.members.length
      s[t.id] = { total, n, avg: n ? total / n : 0 }
    })
    return s
  }, [tapRaw, players, teams])
  const teamMax = Math.max(1, ...teams.map((t) => teamStats[t.id]?.avg || 0))

  // 개인전: 개인별 연타수 내림차순 (입력 0인 사람은 제외)
  const solo = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    return toList(tapRaw)
      .map((t) => ({ id: t.id, name: byId[t.id]?.nickname || '?', teamId: byId[t.id]?.teamId, count: t.value || 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [tapRaw, players])

  const timeUp = running && !paused && endsAt && nowTick >= endsAt
  const teamWinner = timeUp ? [...teams].sort((a, b) => (teamStats[b.id]?.avg || 0) - (teamStats[a.id]?.avg || 0))[0] : null

  // 액션들
  const setMode = (m) => dbUpdate(base, { mode: m })
  const changeSec = (d) => dbUpdate(base, { raceSec: Math.min(MAX_SEC, Math.max(MIN_SEC, raceSec + d)) })
  const startRace = () =>
    dbUpdate(base, { running: true, paused: false, remainMs: null, startedAt: Date.now(), endsAt: Date.now() + raceSec * 1000, tap: null })
  const pauseRace = () => dbUpdate(base, { paused: true, remainMs: Math.max(0, endsAt - Date.now()) })
  const resumeRace = () => dbUpdate(base, { paused: false, endsAt: Date.now() + (remainMs || 0), remainMs: null })
  const newRace = () => dbUpdate(base, { running: false, paused: false, endsAt: null, remainMs: null, tap: null })

  // 좌측 주 버튼: 대기→시작 / 진행중→일시정지 / 일시정지→계속 / 종료→다시 시작
  let leftBtn
  if (!running || timeUp) leftBtn = <Button variant="ok" onClick={startRace}>🏁 레이스 시작</Button>
  else if (paused) leftBtn = <Button variant="ok" onClick={resumeRace}>▶ 계속</Button>
  else leftBtn = <Button variant="warn" onClick={pauseRace}>⏸ 일시정지</Button>

  const idle = !running

  return (
    <div className="text-center">
      {/* 모드 선택 (대기 중에만) */}
      {idle && (
        <div className="mb-3">
          <ModeTabs modes={MODES} value={mode} onChange={setMode} />
        </div>
      )}

      {/* 컨트롤 행: [시작/일시정지/계속] [새 레이스] */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {leftBtn}
        <Button variant="ghost" onClick={newRace}>🔄 새 레이스</Button>
      </div>

      {/* 시간 설정(대기 중) / 타이머(진행·일시정지) */}
      <div className="mt-3 flex items-center justify-center gap-3">
        {idle ? (
          <>
            <button onClick={() => changeSec(-5)} disabled={raceSec <= MIN_SEC} className="w-11 h-11 rounded-full clay-btn text-2xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
            <div className="font-display text-3xl tabular-nums w-24">{raceSec}초</div>
            <button onClick={() => changeSec(5)} disabled={raceSec >= MAX_SEC} className="w-11 h-11 rounded-full clay-btn text-2xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
          </>
        ) : paused ? (
          <div className="font-display text-5xl tabular-nums" style={{ color: 'var(--c-lemon)' }}>
            ⏸ {((remainMs || 0) / 1000).toFixed(1)}<span className="text-2xl opacity-60">s</span>
          </div>
        ) : (
          <Countdown endsAt={endsAt} />
        )}
      </div>

      {mode === 'solo' ? (
        <SoloBoard ranked={solo} timeUp={timeUp} teams={teams} />
      ) : (
        <>
          {/* 팀 레이싱 막대 (1인당 평균) */}
          <div className="mt-4 space-y-3 max-w-lg mx-auto">
            {teams.map((t) => {
              const st = teamStats[t.id] || { total: 0, n: 0, avg: 0 }
              const pct = (st.avg / teamMax) * 100
              return (
                <div key={t.id}>
                  <div className="flex justify-between font-bold text-sm" style={{ color: t.color }}>
                    <span>{t.name}</span>
                    <span>평균 {st.avg.toFixed(1)} <span className="opacity-70 font-normal">({st.total}회 ÷ {st.n}명)</span></span>
                  </div>
                  <div className="mt-1 h-9 clay-inset relative overflow-hidden">
                    <div className="absolute inset-y-1 left-1 rounded-full transition-all duration-300" style={{ width: `calc(${pct}% - 8px)`, background: t.color, opacity: 0.85 }} />
                    <div className="absolute top-0 h-full flex items-center text-2xl transition-all duration-300" style={{ left: `calc(${pct}% - 22px)` }}>🏎️</div>
                  </div>
                </div>
              )
            })}
          </div>
          {teamWinner && <div className="mt-4 font-display text-4xl animate-pop" style={{ color: teamWinner.color }}>🏆 {teamWinner.name} 승리!</div>}
        </>
      )}
    </div>
  )
}

// 개인전 순위판 — 상위 3 / 하위 3 (입력 없는 사람은 이미 제외됨)
function SoloBoard({ ranked, timeUp, teams }) {
  const teamColor = (tid) => teams.find((t) => t.id === tid)?.color || 'var(--ink)'
  const n = ranked.length
  const topMax = ranked[0]?.count || 1

  if (!n) {
    return <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 눌렀어요. 🤫</p>
  }

  const Row = ({ r, rank, badge }) => {
    const pct = (r.count / topMax) * 100
    return (
      <div className="flex items-center gap-2">
        <span className="font-display text-xl w-8 shrink-0 text-center">{badge || rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-sm font-bold">
            <span className="truncate" style={{ color: teamColor(r.teamId) }}>{r.name}</span>
            <span className="tabular-nums">{r.count}회</span>
          </div>
          <div className="mt-0.5 h-5 clay-inset relative overflow-hidden">
            <div className="absolute inset-y-0.5 left-0.5 rounded-full transition-all duration-300" style={{ width: `calc(${pct}% - 4px)`, background: teamColor(r.teamId), opacity: 0.85 }} />
          </div>
        </div>
      </div>
    )
  }

  // 6명 이하면 겹치니 전체를 하나의 순위로, 그 이상이면 상위3 · 하위3 분리
  const compact = n <= 6

  return (
    <div className="mt-4 max-w-lg mx-auto text-left">
      {timeUp && <div className="mb-2 text-center font-display text-3xl animate-pop" style={{ color: 'var(--c-coral)' }}>🏆 {ranked[0].name} 우승!</div>}
      <div className="text-xs mb-2 text-center" style={{ color: 'var(--ink-soft)' }}>참가 {n}명 (입력 없는 사람 제외)</div>

      {compact ? (
        <div className="space-y-2">
          {ranked.map((r, i) => <Row key={r.id} r={r} rank={i + 1} badge={MEDALS[i]} />)}
        </div>
      ) : (
        <>
          <div className="text-sm font-bold mb-1" style={{ color: 'var(--c-mint)' }}>🔥 상위 3명</div>
          <div className="space-y-2">
            {ranked.slice(0, 3).map((r, i) => <Row key={r.id} r={r} rank={i + 1} badge={MEDALS[i]} />)}
          </div>
          <div className="text-sm font-bold mt-4 mb-1" style={{ color: 'var(--c-coral)' }}>🐢 하위 3명</div>
          <div className="space-y-2">
            {ranked.slice(-3).map((r, i) => <Row key={r.id} r={r} rank={n - 3 + i + 1} />)}
          </div>
        </>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const running = useValue(`${base}/running`)
  const paused = useValue(`${base}/paused`)
  const endsAt = useValue(`${base}/endsAt`)
  const startedAt = useValue(`${base}/startedAt`)
  const pending = useRef(0)
  const [local, setLocal] = useState(0)
  const active = running && !paused && endsAt && Date.now() < endsAt

  // 쌓인 탭을 250ms마다 한 번에 합산 전송 (DB 부하 방지)
  useEffect(() => {
    const flush = () => {
      if (pending.current > 0) {
        const n = pending.current
        pending.current = 0
        dbTransaction(`${base}/tap/${me.id}`, (cur) => (cur || 0) + n)
      }
    }
    const iv = setInterval(flush, 250)
    return () => {
      flush()
      clearInterval(iv)
    }
  }, [base, me.id])

  // 새 레이스가 시작될 때만 로컬 카운터 리셋 (일시정지/계속에는 유지)
  useEffect(() => {
    setLocal(0)
  }, [startedAt])

  const tap = () => {
    if (!active) return
    pending.current += 1
    setLocal((n) => n + 1)
    if (navigator.vibrate) navigator.vibrate(8)
  }

  const label = active ? '🔥 연타!! 🔥' : paused && running ? '⏸ 일시정지' : '대기'
  return (
    <div className="text-center">
      {active ? <Countdown endsAt={endsAt} size="text-3xl" /> : paused && running ? <div className="font-display text-3xl" style={{ color: 'var(--c-lemon)' }}>⏸ 일시정지</div> : null}
      <button
        onPointerDown={tap}
        disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn"
        style={{ background: active ? 'var(--c-coral)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--ink-soft)' }}
      >
        {label}
        <div className="text-2xl mt-2">{local}</div>
      </button>
    </div>
  )
}

export default {
  id: 'tap',
  name: '연타 레이싱',
  emoji: '🏎️',
  tagline: '팀전·개인전 연타 레이싱',
  genres: ['physical'],
  traits: ['team', 'solo'],
  // 시작/일시정지/계속/새 레이스를 게임이 자체 렌더 → 프레임워크 컨트롤 바 숨김
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
