// 커지는 풍선 🎈 — 돌아가며 풍선을 펌프. 내 차례엔 원하는 만큼 여러 번 펌프할 수 있고,
// 한 번이라도 펌프한 뒤 '넘기기'로 다음 사람에게 넘긴다. 매 펌프 1/(한계−현재) 확률로 펑!
// 터뜨린 사람이 벌칙 🍺. 지를수록(많이 펌프할수록) 남은 여유가 줄어 다음 사람 위험 급등 → 떠넘기기 심리전.
// 사전 저장 없이 매 탭 확률 판정 → 치트 불가 + 한계 도달 시 반드시 터짐(무한 지연 없음).
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'

const DEFAULT_CAP = 10
const MIN_CAP = 6
const MAX_CAP = 16

// 접속자를 joinedAt 순으로 고정 정렬 → 안정적 턴 순서
function turnOrder(players) {
  return players
    .filter((p) => p.connected !== false)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
}

const riskOf = (cap, pumps) => 1 / Math.max(1, cap - pumps) // 다음 펌프가 터질 확률
const riskColor = (r) => (r < 0.25 ? 'var(--c-mint)' : r < 0.5 ? 'var(--c-lemon)' : r < 0.75 ? 'var(--c-coral)' : '#e11d48')

const SHAKE_CSS = `@keyframes agwBalloonShake{0%,100%{transform:translate(0,0) rotate(0deg)}20%{transform:translate(-2px,1.5px) rotate(-2.2deg)}60%{transform:translate(2px,-1.5px) rotate(2.2deg)}}`

// CSS 풍선 — pumps/cap 으로 크기·색이 변함(에셋 불필요, 커질수록 빨갛게·심하게 떨림)
function Balloon({ cap, pumps, popped, size = 'lg' }) {
  const risk = riskOf(cap, pumps)
  const color = popped ? '#9ca3af' : riskColor(risk)
  const base = size === 'lg' ? 74 : 58
  const grow = size === 'lg' ? 150 : 96
  const px = base + (pumps / cap) * grow
  const shakeDur = Math.max(0.12, 0.55 - risk * 0.45) // 위험할수록 빠르게 떨림
  if (popped) {
    return (
      <div className="flex items-center justify-center" style={{ height: base + grow * 0.7 }}>
        <div className="animate-pop" style={{ fontSize: base + 24 }}>🎈💥</div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-end" style={{ height: base + grow + 24 }}>
      <style>{SHAKE_CSS}</style>
      <div style={{ animation: `agwBalloonShake ${shakeDur}s ease-in-out infinite` }}>
        <div style={{
          width: px, height: px * 1.18,
          background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.75), ${color} 60%)`,
          borderRadius: '50% 50% 50% 50% / 46% 46% 54% 54%',
          boxShadow: `0 6px 16px ${color}55, inset -6px -8px 14px rgba(0,0,0,.12)`,
        }} />
        {/* 매듭 */}
        <div style={{ width: 0, height: 0, margin: '-2px auto 0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `10px solid ${color}` }} />
      </div>
    </div>
  )
}

// 실시간 위험도 게이지
function RiskGauge({ cap, pumps }) {
  const risk = riskOf(cap, pumps)
  const pct = Math.round(risk * 100)
  const color = riskColor(risk)
  return (
    <div className="max-w-xs mx-auto mt-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>
        <span>다음 펌프 터질 확률</span><span className="font-display" style={{ color }}>{pct}%</span>
      </div>
      <div className="clay-inset h-3 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .2s' }} />
      </div>
    </div>
  )
}

function HostView({ base, meta, players }) {
  const cap = useValue(`${base}/cap`) || DEFAULT_CAP
  const pumps = useValue(`${base}/pumps`) || 0
  const victim = useValue(`${base}/victim`)
  const turnIdx = useValue(`${base}/turnIdx`) || 0
  const staged = meta.roundStatus === 'staged'

  const order = useMemo(() => turnOrder(players), [players])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const cur = order.length ? order[turnIdx % order.length] : null
  const setCap = (d) => dbSet(`${base}/cap`, Math.max(MIN_CAP, Math.min(MAX_CAP, cap + d)))

  return (
    <div className="text-center">
      {staged ? (
        <>
          <div className="text-6xl">🎈</div>
          <p className="mt-1 font-display text-lg">커지는 풍선</p>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
            돌아가며 펌프! 내 차례엔 원하는 만큼 여러 번 눌러도 돼요. 터뜨린 사람이 벌칙 🍺
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>풍선 한계</span>
            <button onClick={() => setCap(-1)} disabled={cap <= MIN_CAP} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
            <span className="font-display text-2xl w-12">🎈{cap}</span>
            <button onClick={() => setCap(1)} disabled={cap >= MAX_CAP} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>한계가 작을수록 빨리·위험하게 터져요</p>
          <p className="mt-4 text-sm font-display" style={{ color: 'var(--c-coral)' }}>▶ 시작을 누르면 시작해요 🎈</p>
        </>
      ) : victim ? (
        <div className="mt-2">
          <Balloon cap={cap} pumps={pumps} popped />
          <div className="font-display text-3xl animate-pop" style={{ color: 'var(--c-coral)' }}>💥 {byId[victim]?.nickname || '?'} 터뜨렸다!</div>
          <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>벌칙 한 잔! 🍺 · ‘새 게임’으로 다시</p>
        </div>
      ) : (
        <div className="mt-2">
          <div className="font-display text-2xl" style={{ color: 'var(--c-sky)' }}>🎈 {cur?.nickname || '?'} 님 차례</div>
          <Balloon cap={cap} pumps={pumps} />
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{pumps}/{cap} 펌프 · 두근두근…</p>
          <RiskGauge cap={cap} pumps={pumps} />
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const cap = useValue(`${base}/cap`) || DEFAULT_CAP
  const pumps = useValue(`${base}/pumps`) || 0
  const victim = useValue(`${base}/victim`)
  const turnIdx = useValue(`${base}/turnIdx`) || 0
  const turnPumps = useValue(`${base}/turnPumps`) || 0
  const open = meta.roundStatus === 'open'

  const order = useMemo(() => turnOrder(players), [players])
  const cur = order.length ? order[turnIdx % order.length] : null
  const myTurn = open && !victim && cur?.id === me.id

  const pump = () => {
    if (!myTurn) return
    const remaining = cap - pumps
    const pop = Math.random() < 1 / Math.max(1, remaining) // 매 펌프 1/남은수 → 균등 트랩, 한계 도달 시 확정
    if (pop) {
      dbUpdate(base, { victim: me.id, poppedAt: pumps + 1 })
      if (navigator.vibrate) navigator.vibrate([80, 40, 140])
    } else {
      dbUpdate(base, { pumps: pumps + 1, turnPumps: turnPumps + 1 })
      if (navigator.vibrate) navigator.vibrate(25)
    }
  }
  const pass = () => {
    if (!myTurn || turnPumps < 1) return
    dbUpdate(base, { turnIdx: turnIdx + 1, turnPumps: 0 })
  }

  if (victim) {
    const iAmVictim = victim === me.id
    return (
      <div className="text-center py-8 clay" style={{ background: iAmVictim ? 'var(--c-coral)' : 'var(--surface)', color: iAmVictim ? '#fff' : 'var(--ink)' }}>
        <div className="text-6xl">{iAmVictim ? '💥' : '🎈'}</div>
        <p className="mt-2 font-display text-2xl">{iAmVictim ? '내가 터뜨렸다! 벌칙 🍺' : `${order.find((p) => p.id === victim)?.nickname || '누군가'} 터뜨림!`}</p>
        <p className="mt-1 text-sm opacity-90">진행자가 ‘새 게임’을 누르면 다시 시작해요.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="mt-1 font-display text-lg">{myTurn ? '내 차례! 펌프해 😬' : `${cur?.nickname || '?'} 님 차례…`}</p>
      <Balloon cap={cap} pumps={pumps} size={myTurn ? 'lg' : 'sm'} />
      <RiskGauge cap={cap} pumps={pumps} />

      {myTurn ? (
        <>
          <div className="mt-4 flex gap-2 max-w-xs mx-auto">
            <button onClick={pump} className="flex-1 h-20 rounded-2xl font-display text-xl clay-btn" style={{ background: 'var(--c-mint)', color: '#fff' }}>
              🎈 펌프!
            </button>
            <button onClick={pass} disabled={turnPumps < 1} className="flex-1 h-20 rounded-2xl font-display text-lg clay-btn disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
              ➡️ 넘기기
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            {turnPumps < 1 ? '최소 한 번은 펌프해야 넘길 수 있어요' : `이번 턴 ${turnPumps}번 펌프 · 지를수록 다음 사람이 위험해져요 😈`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{open ? `${pumps}/${cap} 펌프됨 · 내 차례를 기다려요` : '진행자 대기 중…'}</p>
      )}
    </div>
  )
}

export default {
  id: 'croc',
  name: '커지는 풍선',
  emoji: '🎈',
  tagline: '돌아가며 펌프 · 터뜨린 사람 벌칙 · 지를수록 다음 사람 위험',
  genres: ['physical'],
  traits: ['solo'],
  controls: { reveal: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임', resetArms: true },
  HostView,
  PlayerView,
}
