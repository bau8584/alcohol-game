// 눈치게임 (진짜) — 동시에 누르면 안 된다.
// 혼자 누르면 '통과'(1번·2번… 순서 획득). Δ초 안에 둘 이상 누르면 💥겹침 → 그 사람들만 무효, 다시 눌러야 함.
// N-1명이 통과하면 남은 1명이 꼴찌(패배). 제한시간 넘기면 아직 통과 못 한 사람 전원 패배.
// 한 번 누르면 쿨다운 동안 못 누름(연타 방지). 동시 판정은 serverNow(서버 기준 시계)로 재서 기기가 달라도 일관.
// 판정은 전부 각 기기에서 press 로그로 자동 계산(호스트 중재 없음).
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbUpdate, dbPush, toList, serverNow } from '../lib/db'
import { Button } from '../components/ui'

const DELTA = 600 // 동시 판정 창(ms) — 이 안에 둘이 누르면 겹침
const COOLDOWN = 4000 // 누른 뒤 못 누르는 시간(ms)
const LIMITS = [30, 45, 60]
const DEFAULT_LIMIT = 45

function useNow(on) {
  const [now, setNow] = useState(serverNow())
  useEffect(() => {
    if (!on) return
    const iv = setInterval(() => setNow(serverNow()), 100)
    return () => clearInterval(iv)
  }, [on])
  return now
}

// press 로그 → 통과 순서/겹침/쿨다운 계산 (윈도우 배치 방식)
function computeClaims(pressRaw, liveIds) {
  const liveSet = new Set(liveIds)
  const sorted = toList(pressRaw)
    .filter((p) => typeof p.ts === 'number' && liveSet.has(p.pid))
    .sort((a, b) => a.ts - b.ts)

  // 쿨다운 내 재입력(도배)은 무시 — 같은 pid의 직전 유효 press로부터 COOLDOWN 이상 지나야 유효
  const kept = []
  const lastKept = {}
  const lastPressTs = {}
  for (const e of sorted) {
    lastPressTs[e.pid] = e.ts // UI 쿨다운 표시는 '실제 마지막 입력' 기준
    if (lastKept[e.pid] != null && e.ts - lastKept[e.pid] < COOLDOWN) continue
    kept.push(e)
    lastKept[e.pid] = e.ts
  }

  // 윈도우 배치: 첫 press 기준 Δ 안의 press들을 한 묶음으로. 한 명뿐이면 통과, 둘+면 겹침.
  const claimed = [] // { pid, ts }
  const claimedSet = new Set()
  let lastCollision = null // { ts, pids }
  let i = 0
  while (i < kept.length) {
    const start = kept[i].ts
    const batch = []
    let j = i
    while (j < kept.length && kept[j].ts - start <= DELTA) { batch.push(kept[j]); j++ }
    const pids = [...new Set(batch.map((b) => b.pid).filter((pid) => !claimedSet.has(pid)))]
    if (pids.length === 1) { claimed.push({ pid: pids[0], ts: start }); claimedSet.add(pids[0]) }
    else if (pids.length >= 2) { lastCollision = { ts: start, pids } }
    i = j
  }
  return { claimed, claimedSet, lastCollision, lastPressTs }
}

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

// 라운드 상태 종합 (호스트/플레이어 공용)
function useResolve({ base, players }) {
  const pressRaw = useValue(`${base}/presses`)
  const startedAt = useValue(`${base}/startedAt`)
  const deadline = useValue(`${base}/deadline`)
  const live = players.filter((p) => p.connected !== false)
  const liveIds = live.map((p) => p.id)
  const running = !!startedAt
  const now = useNow(running)

  const { claimed, claimedSet, lastCollision, lastPressTs } = useMemo(
    () => computeClaims(pressRaw, liveIds),
    [pressRaw, liveIds.join(',')] // eslint-disable-line
  )
  const remaining = live.filter((p) => !claimedSet.has(p.id))
  const N = live.length
  const timeUp = running && deadline && now >= deadline
  // 종료: 남은 1명 이하 → 그 1명(또는 마지막 통과자)이 패배 / 시간초과 → 미통과 전원 패배
  let done = false
  let losers = []
  if (running && N >= 2) {
    if (remaining.length <= 1) {
      done = true
      losers = remaining.length === 1 ? [remaining[0]] : claimed.length ? [live.find((p) => p.id === claimed[claimed.length - 1].pid)].filter(Boolean) : []
    } else if (timeUp) {
      done = true
      losers = remaining
    }
  }
  const loserIds = new Set(losers.map((l) => l.id))
  return { claimed, claimedSet, remaining, lastCollision, lastPressTs, N, live, running, now, deadline, done, losers, loserIds }
}

function HostView({ base, players }) {
  const st = useResolve({ base, players })
  const limitSec = useValue(`${base}/limitSec`) || DEFAULT_LIMIT
  const nameOf = useNameOf(players)
  const idle = !st.running

  const start = () => {
    const t = serverNow()
    dbUpdate(base, { startedAt: t, deadline: t + limitSec * 1000, presses: null })
  }
  const reset = () => dbUpdate(base, { startedAt: null, deadline: null, presses: null })
  const secsLeft = st.deadline ? Math.max(0, Math.ceil((st.deadline - st.now) / 1000)) : limitSec

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ok" onClick={start} disabled={st.N < 2}>{st.running ? '🔄 새 판' : '👀 시작'}</Button>
        {st.running && <Button variant="ghost" onClick={reset}>■ 정지</Button>}
      </div>

      {idle ? (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>제한시간</div>
          <div className="flex justify-center gap-2">
            {LIMITS.map((s) => (
              <button key={s} onClick={() => dbUpdate(base, { limitSec: s })} className="clay-btn px-4 py-2 font-display"
                style={limitSec === s ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {s}초
              </button>
            ))}
          </div>
          <p className="mt-4 font-display text-lg" style={{ color: 'var(--ink-soft)' }}>
            혼자 누르면 통과 · 동시에 누르면 겹침 💥 · 마지막 1명이 꼴찌 🍺
          </p>
          {st.N < 2 && <p className="text-sm mt-1" style={{ color: 'var(--c-coral)' }}>2명 이상 필요 (3명+ 권장)</p>}
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="font-display tabular-nums" style={{ fontSize: '3.5rem', lineHeight: 1, color: secsLeft <= 5 ? 'var(--c-coral)' : 'var(--ink)' }}>{secsLeft}<span className="text-2xl">초</span></div>
            <div className="text-left" style={{ color: 'var(--ink-soft)' }}>
              통과 <span className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{st.claimed.length}</span> / {st.N}
              <div className="text-sm">남은 사람 {st.remaining.length}명</div>
            </div>
          </div>

          {/* 통과 순서 */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {st.claimed.map((c, i) => (
              <span key={c.pid} className="clay-inset px-3 py-1.5 font-bold animate-pop">{i + 1}. {nameOf(c.pid)}</span>
            ))}
            {!st.claimed.length && <p className="py-4" style={{ color: 'var(--ink-soft)' }}>아직 아무도 통과 못 했어요 🤫</p>}
          </div>

          {/* 최근 겹침 */}
          {st.lastCollision && !st.done && (
            <div className="mt-3 clay p-2 max-w-md mx-auto animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              💥 {st.lastCollision.pids.map((p) => nameOf(p)).join(' · ')} 동시에 눌러서 무효 · 다시!
            </div>
          )}

          {/* 결과 */}
          {st.done && (
            <div className="mt-4 clay p-4 animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-3xl">😱 꼴찌 · 벌칙 🍺</div>
              <div className="font-display text-2xl mt-1">{st.losers.map((l) => l.nickname).join(', ') || '—'}</div>
              {st.deadline && st.now >= st.deadline && st.losers.length > 1 && <div className="text-sm mt-1 opacity-90">시간 초과!</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PlayerView({ base, players, me }) {
  const st = useResolve({ base, players })
  const nameOf = useNameOf(players)
  const myClaim = st.claimed.findIndex((c) => c.pid === me.id)
  const claimed = myClaim >= 0
  const iLost = st.loserIds.has(me.id)
  const myLastPress = st.lastPressTs[me.id]
  const cooldownLeft = myLastPress ? Math.max(0, COOLDOWN - (st.now - myLastPress)) : 0
  const onCooldown = cooldownLeft > 0
  const inCollision = st.lastCollision && st.lastCollision.pids.includes(me.id) && !claimed
  const active = st.running && !st.done && !claimed && !onCooldown && st.now < (st.deadline || Infinity)

  const press = () => {
    if (!active) return
    dbPush(`${base}/presses`, { pid: me.id, ts: serverNow() })
    if (navigator.vibrate) navigator.vibrate(30)
  }

  let label = '대기'
  let bg = 'var(--surface-2)'
  let fg = 'var(--ink-soft)'
  if (!st.running) { label = '대기'; }
  else if (iLost) { label = '😱 꼴찌!'; bg = 'var(--c-coral)'; fg = '#fff' }
  else if (st.done) { label = '✅ 안전'; bg = 'var(--c-mint)'; fg = '#fff' }
  else if (claimed) { label = `✅ ${myClaim + 1}번째 통과`; bg = 'var(--c-mint)'; fg = '#fff' }
  else if (onCooldown) { label = `${(cooldownLeft / 1000).toFixed(1)}초 대기`; bg = inCollision ? 'var(--c-coral)' : 'var(--surface-2)'; fg = inCollision ? '#fff' : 'var(--ink-soft)' }
  else if (active) { label = '👀 지금?'; bg = 'var(--c-grape)'; fg = '#fff' }

  const secsLeft = st.deadline ? Math.max(0, Math.ceil((st.deadline - st.now) / 1000)) : 0

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {!st.running ? '진행자 대기 중' : st.done ? '판 종료' : `통과 ${st.claimed.length}/${st.N} · ⏱ ${secsLeft}초`}
      </div>
      <button onPointerDown={press} disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn transition-colors"
        style={{ background: bg, color: fg }}>
        {label}
      </button>
      {iLost ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>마지막까지 못 통과했어요 · 벌칙 🍺</p>
      ) : claimed ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-mint)' }}>{myClaim + 1}번째로 통과 · 안전 ✅</p>
      ) : inCollision && onCooldown ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 동시에 눌렀어요! 잠시 후 다시</p>
      ) : onCooldown ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>쿨다운 중… 조금만 참아요</p>
      ) : active ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>아무도 안 누를 것 같은 순간에! 겹치면 무효 🫣</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>혼자 누르면 통과 · 마지막 1명이 꼴찌</p>
      )}
    </div>
  )
}

export default {
  id: 'eunchi',
  name: '눈치게임',
  emoji: '👀',
  tagline: '동시에 누르면 겹침 · 마지막이 꼴찌',
  genres: ['physical', 'mind'],
  traits: ['solo'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
