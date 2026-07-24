// 금고 털이(은행 강도) — 시간 대신 '차오르는 금액 ₩'을 본다. 오래 털수록 금고가 더 빨리 쌓인다(가속).
// 경찰이 언제 급습할지는 아무도 모른다. 튀면 그때까지 챙긴 금액이 점수. 안 튀고 붙잡히면 0원 + 벌칙.
// 초는 안 보이고, 대신 위험 게이지(달아오르는 색·맥박)로 긴장을 표현. 경찰은 3초~최대초 사이 랜덤 급습.
// (구조는 press-your-luck: 오래 = 이득, 갑자기 = 파국. 게임 id는 호환 위해 'chicken' 유지.)
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList, serverNow } from '../lib/db'
import { setRoundStatus } from '../lib/actions'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MIN_MS = 3000
const MAXES = [10, 15, 20, 30]
const DEFAULT_MAX = 15
const MEDALS = ['🥇', '🥈', '🥉']
const MODES = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
]

const fmt = (ms) => (Math.max(0, ms) / 1000).toFixed(2)
// 금액 = 가속(초² × 5천원, 천원 단위 반올림) → 후반일수록 급등. 저장은 그대로 ms, 표시는 금액.
const moneyOf = (ms) => Math.round((Math.max(0, ms) / 1000) ** 2 * 5000 / 1000) * 1000
const wonStr = (n) => '₩' + Math.max(0, Math.round(n)).toLocaleString('ko-KR')
const fmtWon = (ms) => wonStr(moneyOf(ms))

// 초 숫자 대신 위험을 보여주는 게이지 (달아오르는 막대 + 단계 문구, 숫자 없음)
function DangerGauge({ danger }) {
  const label = danger <= 0 ? '🟢 아직 조용함' : danger < 0.45 ? '🟡 슬슬 위험' : danger < 0.8 ? '🟠 위험!' : '🔴 매우 위험!!'
  return (
    <div className="mt-3 max-w-xs mx-auto">
      <div className="h-3.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.round(Math.max(4, danger * 100))}%`, background: heatColor(danger) }} />
      </div>
      <div className="text-sm mt-1 font-display" style={{ color: danger > 0.55 ? 'var(--c-coral)' : 'var(--ink-soft)' }}>{label}</div>
    </div>
  )
}

// 위험도 0~1 — MIN_MS(조용) 이후부터 maxSec(최대)까지 선형으로 오른다.
const dangerOf = (ms, maxSec) => {
  const span = maxSec * 1000 - MIN_MS
  return span <= 0 ? 0 : Math.max(0, Math.min(1, (ms - MIN_MS) / span))
}
// 위험도에 따라 초록→노랑→빨강으로 달아오르는 색
const heatColor = (d) => (d <= 0 ? 'var(--c-mint)' : `hsl(${Math.round(140 - 140 * d)}, 85%, ${Math.round(52 - 8 * d)}%)`)

// 진행 중일 때만 도는 시계 (서버 기준 — 기기 시계 차이 무시)
function useTicker(on) {
  const [now, setNow] = useState(serverNow())
  useEffect(() => {
    if (!on) return
    let raf = 0
    const loop = () => {
      setNow(serverNow())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return now
}

// 뱅크(튄) 기록 → 순위 (급습 뒤에 들어온 기록은 무효)
function useBoard(base, players, boomMs) {
  const raw = useValue(`${base}/bank`)
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const banked = toList(raw)
      .filter((b) => boomMs == null || b.value < boomMs)
      .map((b) => ({ id: b.id, ms: b.value, name: byId[b.id]?.nickname || '?', teamId: byId[b.id]?.teamId }))
      .sort((a, b) => b.ms - a.ms)
    const bankedIds = new Set(banked.map((b) => b.id))
    const live = players.filter((p) => p.connected !== false)
    return { banked, bankedIds, holding: live.filter((p) => !bankedIds.has(p.id)) }
  }, [raw, players, boomMs])
}

function HostView({ roomId, base, players, teams }) {
  const startedAt = useValue(`${base}/startedAt`)
  const boomAt = useValue(`${base}/boomAt`)
  const boomedAt = useValue(`${base}/boomedAt`)
  const maxSec = useValue(`${base}/maxSec`) || DEFAULT_MAX
  const mode = useValue(`${base}/mode`) || 'solo'
  const boomMs = boomedAt && startedAt ? boomedAt - startedAt : null
  const { banked, holding } = useBoard(base, players, boomMs)

  // 팀별 '튄 멤버 평균 금액' (잡힌 사람은 banked에 없으니 자동 제외)
  const teamStats = useMemo(() => {
    const s = {}
    teams.forEach((t) => (s[t.id] = { sum: 0, n: 0, avg: 0 }))
    banked.forEach((b) => { if (b.teamId && s[b.teamId]) { s[b.teamId].sum += moneyOf(b.ms); s[b.teamId].n++ } })
    teams.forEach((t) => (s[t.id].avg = s[t.id].n ? Math.round(s[t.id].sum / s[t.id].n) : 0))
    return s
  }, [banked, teams])
  const teamRanked = useMemo(() => [...teams].sort((a, b) => (teamStats[b.id]?.avg || 0) - (teamStats[a.id]?.avg || 0)), [teams, teamStats])
  const teamMaxAvg = Math.max(1, ...teams.map((t) => teamStats[t.id]?.avg || 0))

  const running = !!startedAt && !boomedAt
  const now = useTicker(running)

  // 급습 선언은 rAF 틱이 아니라 타이머로 예약 → 호스트 탭이 백그라운드여도 제때 터진다.
  // boomedAt = boomAt(예정 시각)로 확정해 모든 화면이 같은 값을 본다.
  useEffect(() => {
    if (!running || !boomAt) return
    const id = setTimeout(() => dbSet(`${base}/boomedAt`, boomAt), Math.max(0, boomAt - serverNow()))
    return () => clearTimeout(id)
  }, [running, boomAt, base])

  const start = () => {
    const t = serverNow()
    dbUpdate(base, {
      startedAt: t,
      boomAt: t + MIN_MS + Math.floor(Math.random() * (maxSec * 1000 - MIN_MS)),
      boomedAt: null,
      bank: null,
    })
    setRoundStatus(roomId, 'open') // '내 플레이' 자동 전환 신호
  }
  const reset = () => {
    dbUpdate(base, { startedAt: null, boomAt: null, boomedAt: null, bank: null })
    setRoundStatus(roomId, 'staged') // 다음 시작이 staged→open 전환이 되도록 리셋
  }

  const idle = !startedAt
  const elapsed = startedAt ? (boomedAt ? boomedAt - startedAt : now - startedAt) : 0
  const hostDanger = running ? dangerOf(elapsed, maxSec) : 0
  const teamColor = (tid) => teams.find((t) => t.id === tid)?.color || 'var(--ink)'

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ok" onClick={start}>💰 털기 시작</Button>
        <Button variant="ghost" onClick={reset}>🔄 새 라운드</Button>
      </div>

      {idle ? (
        <div className="mt-4">
          <div className="mb-3"><ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} /></div>
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>경찰 급습까지 (3초~최대초 사이 랜덤)</div>
          <div className="flex justify-center gap-2">
            {MAXES.map((s) => (
              <button key={s} onClick={() => dbSet(`${base}/maxSec`, s)} className="clay-btn px-4 py-2 font-display"
                style={maxSec === s ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {s}초
              </button>
            ))}
          </div>
          <p className="mt-4 font-display text-lg" style={{ color: 'var(--ink-soft)' }}>
            오래 털수록 금고 급등 💰 · 잡히면 0원 🍺
            {mode === 'team' && <span className="block text-sm mt-1">👥 팀전: 튄 멤버들의 <b>평균 금액</b>으로 승부 (잡힌 사람 제외)</span>}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>💰 지금 튀면 챙기는 돈</div>
          <div className={`font-display tabular-nums ${!boomedAt && hostDanger > 0.55 ? 'animate-pulse' : ''}`} style={{ fontSize: '3.75rem', lineHeight: 1.05, color: boomedAt ? 'var(--c-coral)' : heatColor(hostDanger) }}>
            {fmtWon(elapsed)}
          </div>
          {boomedAt ? (
            <div className="mt-2 font-display text-4xl animate-pop" style={{ color: 'var(--c-coral)' }}>🚨 경찰 급습!</div>
          ) : (
            <>
              <DangerGauge danger={hostDanger} />
              <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>터는 중 {holding.length}명 · 튄 사람 {banked.length}명</div>
            </>
          )}
        </div>
      )}

      {!idle && mode === 'team' && (
        <div className="mt-4 max-w-lg mx-auto">
          <div className="text-xs mb-2 text-center" style={{ color: 'var(--ink-soft)' }}>튄 멤버 평균 금액 · 잡힌 사람 제외</div>
          <div className="space-y-3 text-left">
            {teamRanked.map((t, i) => {
              const st = teamStats[t.id] || { avg: 0, n: 0 }
              const pct = (st.avg / teamMaxAvg) * 100
              const win = boomedAt && i === 0 && st.avg > 0
              return (
                <div key={t.id}>
                  <div className="flex justify-between font-bold text-sm" style={{ color: t.color }}>
                    <span>{win ? '🏆 ' : ''}{t.name}</span>
                    <span>평균 {wonStr(st.avg)} <span className="opacity-70 font-normal">(튄 {st.n}명)</span></span>
                  </div>
                  <div className="mt-1 h-8 clay-inset relative overflow-hidden">
                    <div className="absolute inset-y-1 left-1 rounded-full transition-all duration-300" style={{ width: `calc(${pct}% - 8px)`, background: t.color, opacity: 0.85 }} />
                  </div>
                </div>
              )
            })}
          </div>
          {boomedAt && teamRanked[0] && teamStats[teamRanked[0].id]?.avg > 0 && (
            <div className="mt-4 font-display text-3xl animate-pop" style={{ color: teamRanked[0].color }}>🏆 {teamRanked[0].name} 승리!</div>
          )}
          {boomedAt && (
            <div className="clay p-3 mt-3 text-left" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-lg">🚨 붙잡힌 강도 · {holding.length}명 벌칙</div>
              <div className="text-sm mt-1 opacity-90">{holding.map((p) => p.nickname).join(', ') || '전원 탈출 성공!'}</div>
            </div>
          )}
        </div>
      )}

      {!idle && mode === 'solo' && (
        <div className="mt-4 max-w-lg mx-auto text-left space-y-1.5">
          {banked.map((b, i) => (
            <div key={b.id} className="clay flex items-center justify-between px-4 py-2"
              style={boomedAt && i === 0 ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface)' }}>
              <span className="font-display">
                <span className="w-8 inline-block">{boomedAt ? MEDALS[i] || i + 1 : '🏃'}</span>
                <span style={{ color: boomedAt && i === 0 ? '#fff' : teamColor(b.teamId) }}>{b.name}</span>
              </span>
              <span className="font-display tabular-nums">{fmtWon(b.ms)}</span>
            </div>
          ))}
          {!banked.length && !boomedAt && <p className="py-4 text-center" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 튀었어요… 🫣</p>}

          {boomedAt && (
            <div className="clay p-3 mt-3" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-lg">🚨 붙잡힌 강도 · {holding.length}명 벌칙</div>
              <div className="text-sm mt-1 opacity-90">{holding.map((p) => p.nickname).join(', ') || '전원 탈출 성공!'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, players, me }) {
  const startedAt = useValue(`${base}/startedAt`)
  const boomedAt = useValue(`${base}/boomedAt`)
  const mine = useValue(`${base}/bank/${me.id}`)
  const maxSec = useValue(`${base}/maxSec`) || DEFAULT_MAX
  const boomMs = boomedAt && startedAt ? boomedAt - startedAt : null
  const { banked, holding } = useBoard(base, players, boomMs)

  const live = !!startedAt && !boomedAt
  const now = useTicker(live && mine == null)
  const active = live && mine == null
  // 탈출 성공 = 급습 '전에' 튄 기록만. 급습 뒤(네트워크 지연으로 늦게) 누른 기록(mine >= boomMs)은 무효 → 붙잡힘.
  const escaped = mine != null && (boomMs == null || mine < boomMs)
  const caught = !!boomedAt && !escaped // 안 튀었거나, 급습 뒤에 튄 사람
  const lateBank = caught && mine != null // 튀었지만 너무 늦어서 무효
  const elapsed = mine != null ? mine : startedAt ? (boomedAt ? boomedAt - startedAt : now - startedAt) : 0

  const bank = () => {
    if (!active) return
    dbSet(`${base}/bank/${me.id}`, serverNow() - startedAt)
    if (navigator.vibrate) navigator.vibrate(40)
  }

  // 위험도 — 터는 중일 때만. MIN_MS 넘으면 언제든 경찰 급습 가능.
  const danger = active ? dangerOf(elapsed, maxSec) : 0
  const inDanger = active && elapsed > MIN_MS

  let label = '대기'
  if (caught) label = '🚨 붙잡혔다!'
  else if (mine != null) label = boomedAt ? '✅ 탈출 성공' : '🏃 튐'
  else if (active) label = '🏃 튀기!'

  const bg = caught ? 'var(--c-coral)' : mine != null ? 'var(--c-mint)' : active ? heatColor(danger) : 'var(--surface-2)'
  const myRank = mine != null ? banked.findIndex((b) => b.id === me.id) + 1 : 0

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {startedAt ? (boomedAt ? '라운드 종료' : `터는 중 ${holding.length}명 · 튄 사람 ${banked.length}명`) : '진행자 대기 중'}
      </div>
      <button onPointerDown={bank} disabled={!active}
        className={`mt-3 w-full h-72 rounded-3xl clay-btn transition-colors flex flex-col items-center justify-center ${inDanger && danger > 0.55 ? 'animate-pulse' : ''}`}
        style={{ background: bg, color: startedAt ? '#fff' : 'var(--ink-soft)' }}>
        <div className="font-display text-2xl">{active ? (inDanger ? '🏃 지금 튀어?!' : '💰 금고 터는 중…') : ''}</div>
        <div className="font-display text-6xl tabular-nums mt-1">{mine != null || active || boomedAt ? fmtWon(elapsed) : '💰'}</div>
        <div className="font-display text-3xl mt-2">{label}</div>
      </button>
      {active && <DangerGauge danger={danger} />}
      {caught ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>
          {lateBank ? `경찰 온 뒤에 튀었어요 (${fmtWon(mine)}) · 벌칙 🍺` : '안 튀고 있다 붙잡혔어요 · 벌칙 🍺'}
        </p>
      ) : mine != null ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>
          {fmtWon(mine)} 챙기고 튐 · 현재 {myRank}위 {boomedAt ? '' : '· 더 버틴 사람에게 밀릴 수 있어요'}
        </p>
      ) : active ? (
        <p className="mt-2 font-display" style={{ color: inDanger ? 'var(--c-coral)' : 'var(--ink-soft)' }}>
          {inDanger ? '🚨 언제든 경찰 급습! 욕심내면 0원 🍺' : '아직은 조용… 오래 털수록 급등 💰'}
        </p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>오래 털수록 큰돈 · 잡히면 0원 🍺</p>
      )}
    </div>
  )
}

export default {
  id: 'chicken',
  name: '금고 털이',
  emoji: '💰',
  tagline: '차오르는 돈 챙겨 튀기 · 잡히면 0원',
  genres: ['physical', 'mind'],
  traits: ['team', 'solo'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
