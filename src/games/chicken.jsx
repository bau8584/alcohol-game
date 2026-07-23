// 치킨게임 — 모두가 같은 숫자를 본다. 시작하면 초가 올라가고, 언제 터질지는 아무도 모른다.
// 멈추면 그 시간이 내 점수. 안 멈추고 버티다 폭발하면 0점 + 벌칙.
// 오래 버틸수록 이득이지만 폭탄은 3초~최대초 사이 랜덤. 하나둘 빠지는 게 화면에 실시간으로 보인다.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList, serverNow } from '../lib/db'
import { setRoundStatus } from '../lib/actions'
import { Button } from '../components/ui'

const MIN_MS = 3000
const MAXES = [10, 15, 20, 30]
const DEFAULT_MAX = 15
const MEDALS = ['🥇', '🥈', '🥉']

const fmt = (ms) => (Math.max(0, ms) / 1000).toFixed(2)

// 위험도 0~1 — MIN_MS(안전) 이후부터 maxSec(최대)까지 선형으로 오른다.
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

// 뱅크 기록 → 순위 (터진 뒤에 들어온 기록은 무효)
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
  const boomMs = boomedAt && startedAt ? boomedAt - startedAt : null
  const { banked, holding } = useBoard(base, players, boomMs)

  const running = !!startedAt && !boomedAt
  const now = useTicker(running)

  // 폭발 선언은 rAF 틱이 아니라 타이머로 예약한다 → 호스트 탭이 백그라운드여도 제때 터진다.
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
        <Button variant="ok" onClick={start}>💣 시작</Button>
        <Button variant="ghost" onClick={reset}>🔄 새 라운드</Button>
      </div>

      {idle ? (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>폭탄 최대 시간 (3초~최대초 사이 랜덤)</div>
          <div className="flex justify-center gap-2">
            {MAXES.map((s) => (
              <button key={s} onClick={() => dbSet(`${base}/maxSec`, s)} className="clay-btn px-4 py-2 font-display"
                style={maxSec === s ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {s}초
              </button>
            ))}
          </div>
          <p className="mt-4 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>버틸수록 점수 ↑ · 터지면 0점 🍺</p>
        </div>
      ) : (
        <div className="mt-4">
          <div className={`font-display tabular-nums ${!boomedAt && hostDanger > 0.55 ? 'animate-pulse' : ''}`} style={{ fontSize: '5rem', lineHeight: 1, color: boomedAt ? 'var(--c-coral)' : heatColor(hostDanger) }}>
            {fmt(elapsed)}
          </div>
          {boomedAt ? (
            <div className="mt-2 font-display text-4xl animate-pop" style={{ color: 'var(--c-coral)' }}>💥 펑!</div>
          ) : (
            <>
              <div className="mt-1 font-display" style={{ color: elapsed > MIN_MS ? 'var(--c-coral)' : 'var(--ink-soft)' }}>
                {elapsed > MIN_MS ? '💣 위험 구간 · 언제든 터져요!' : '🟢 안전 구간'}
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>버티는 중 {holding.length}명 · 멈춤 {banked.length}명</div>
            </>
          )}
        </div>
      )}

      {!idle && (
        <div className="mt-4 max-w-lg mx-auto text-left space-y-1.5">
          {banked.map((b, i) => (
            <div key={b.id} className="clay flex items-center justify-between px-4 py-2"
              style={boomedAt && i === 0 ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface)' }}>
              <span className="font-display">
                <span className="w-8 inline-block">{boomedAt ? MEDALS[i] || i + 1 : '✋'}</span>
                <span style={{ color: boomedAt && i === 0 ? '#fff' : teamColor(b.teamId) }}>{b.name}</span>
              </span>
              <span className="font-display tabular-nums">{fmt(b.ms)}초</span>
            </div>
          ))}
          {!banked.length && !boomedAt && <p className="py-4 text-center" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 멈췄어요… 🫣</p>}

          {boomedAt && (
            <div className="clay p-3 mt-3" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-lg">💥 터질 때까지 버틴 사람 · {holding.length}명 벌칙</div>
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
  // 탈출 성공 = 폭발 '전에' 멈춘 기록만. 폭발 뒤(네트워크 지연으로 늦게) 누른 기록(mine >= boomMs)은 무효 → 걸림.
  const escaped = mine != null && (boomMs == null || mine < boomMs)
  const caught = !!boomedAt && !escaped // 안 눌렀거나, 터진 뒤에 누른 사람
  const lateBank = caught && mine != null // 눌렀지만 너무 늦어서 무효
  const elapsed = mine != null ? mine : startedAt ? (boomedAt ? boomedAt - startedAt : now - startedAt) : 0

  const bank = () => {
    if (!active) return
    dbSet(`${base}/bank/${me.id}`, serverNow() - startedAt)
    if (navigator.vibrate) navigator.vibrate(40)
  }

  // 위험도 — 버티는 중일 때만. MIN_MS 넘으면 언제든 터질 수 있음.
  const danger = active ? dangerOf(elapsed, maxSec) : 0
  const inDanger = active && elapsed > MIN_MS

  let label = '대기'
  if (caught) label = '💥 터졌다!'
  else if (mine != null) label = boomedAt ? '✅ 탈출 성공' : '✋ 멈춤'
  else if (active) label = '✋ 멈추기!'

  const bg = caught ? 'var(--c-coral)' : mine != null ? 'var(--c-mint)' : active ? heatColor(danger) : 'var(--surface-2)'
  const myRank = mine != null ? banked.findIndex((b) => b.id === me.id) + 1 : 0

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {startedAt ? (boomedAt ? '라운드 종료' : `버티는 중 ${holding.length}명 · 멈춤 ${banked.length}명`) : '진행자 대기 중'}
      </div>
      <button onPointerDown={bank} disabled={!active}
        className={`mt-3 w-full h-72 rounded-3xl clay-btn transition-colors flex flex-col items-center justify-center ${inDanger && danger > 0.55 ? 'animate-pulse' : ''}`}
        style={{ background: bg, color: startedAt ? '#fff' : 'var(--ink-soft)' }}>
        <div className="font-display text-3xl">{active ? (inDanger ? '🔥 지금 멈춰?!' : '오래 버틸수록 점수 ↑') : ''}</div>
        <div className="font-display text-7xl tabular-nums mt-1">{fmt(elapsed)}</div>
        <div className="font-display text-3xl mt-2">{label}</div>
      </button>
      {caught ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>
          {lateBank ? `터진 뒤에 눌렀어요 (${fmt(mine)}초) · 벌칙 🍺` : '끝까지 버티다 터졌어요 · 벌칙 🍺'}
        </p>
      ) : mine != null ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>
          {fmt(mine)}초에 탈출 · 현재 {myRank}위 {boomedAt ? '' : '· 남은 사람들이 더 버티면 밀립니다'}
        </p>
      ) : active ? (
        <p className="mt-3 font-display" style={{ color: inDanger ? 'var(--c-coral)' : 'var(--ink-soft)' }}>
          {inDanger ? '💣 이제 언제든 터져요! 욕심내면 0점 🍺' : `${(MIN_MS / 1000).toFixed(0)}초까진 안전 · 그 뒤부턴 폭탄 랜덤`}
        </p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>오래 버틸수록 고득점 · 터지면 0점 🍺</p>
      )}
    </div>
  )
}

export default {
  id: 'chicken',
  name: '치킨게임',
  emoji: '💣',
  tagline: '버틸수록 고득점 · 터지면 벌칙',
  genres: ['physical', 'mind'],
  traits: ['solo'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
