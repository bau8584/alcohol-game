// 유니크 넘버 — 다들 몰래 1~N 중 하나를 고른다. 공개하면 '혼자 고른 수(유니크)' 중
// 가장 큰 수를 낸 사람이 승리. 큰 수를 노리되 남과 겹치면 무효. 눈치·블러핑 게임.
// 판정은 자동(중복 집계). open→reveal 프레임워크 사용.
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'

const RANGES = [5, 10, 15, 20]
const DEFAULT_MAX = 10

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

// picks: { pid: number } → { groups: Map<num, pid[]>, unique: [{num,pid}], winner, live }
function resolve(picksRaw, players) {
  const live = players.filter((p) => p.connected !== false)
  const picks = toList(picksRaw)
    .map((p) => ({ pid: p.id, num: p.value }))
    .filter((p) => typeof p.num === 'number')
  const byNum = {}
  picks.forEach((p) => { (byNum[p.num] = byNum[p.num] || []).push(p.pid) })
  const unique = Object.entries(byNum)
    .filter(([, pids]) => pids.length === 1)
    .map(([num, pids]) => ({ num: Number(num), pid: pids[0] }))
    .sort((a, b) => b.num - a.num)
  const collisions = Object.entries(byNum)
    .filter(([, pids]) => pids.length > 1)
    .map(([num, pids]) => ({ num: Number(num), pids }))
    .sort((a, b) => b.pids.length - a.pids.length || b.num - a.num)
  return { picks, unique, collisions, winner: unique[0] || null, picked: picks.length, live }
}

function HostView({ base, meta, players }) {
  const picksRaw = useValue(`${base}/picks`)
  const maxNum = useValue(`${base}/maxNum`) || DEFAULT_MAX
  const nameOf = useNameOf(players)
  const { unique, collisions, winner, picked, live } = useMemo(() => resolve(picksRaw, players), [picksRaw, players])
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'
  const N = live.length

  return (
    <div className="text-center">
      <div className="font-display text-xl">🎯 몰래 1~{maxNum} 중 하나!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>혼자 고른 수 중 <b>가장 큰 수</b>가 승리 · 겹치면 무효 💥</div>

      {staged && (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>숫자 범위</div>
          <div className="flex justify-center gap-2">
            {RANGES.map((n) => (
              <button key={n} onClick={() => dbSet(`${base}/maxNum`, n)} className="clay-btn px-4 py-2 font-display"
                style={maxNum === n ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                1~{n}
              </button>
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>참가 {N}명 · 시작을 누르면 각자 폰에서 선택</div>
        </div>
      )}

      {!staged && !reveal && (
        <div className="mt-4" style={{ color: 'var(--ink-soft)' }}>
          고른 사람 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{picked}</span> / {N}
          <div className="text-sm mt-1">어떤 숫자인지는 공개 전까지 비밀 🤫</div>
        </div>
      )}

      {reveal && (
        <div className="mt-4 space-y-3">
          {winner ? (
            <div className="clay p-4 animate-pop" style={{ background: 'var(--c-mint)', color: '#fff' }}>
              <div className="text-sm opacity-90">🏆 최고 유니크</div>
              <div className="font-display text-4xl">{winner.num} · {nameOf(winner.pid)}</div>
            </div>
          ) : (
            <div className="clay p-4" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-2xl">전원 겹침 — 승자 없음 😵</div>
              <div className="text-sm opacity-90">다 같은 생각을 했네요. 다시!</div>
            </div>
          )}

          <div>
            <div className="text-sm mb-1" style={{ color: 'var(--c-mint)' }}>✅ 유니크(혼자 고른 수)</div>
            <div className="flex flex-wrap justify-center gap-2">
              {unique.map((u, i) => (
                <span key={u.num} className="clay-inset px-3 py-1.5 font-bold" style={i === 0 ? { background: 'var(--c-mint)', color: '#fff' } : {}}>
                  {i === 0 && '🏆 '}{u.num} · {nameOf(u.pid)}
                </span>
              ))}
              {!unique.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>유니크한 수가 없어요.</span>}
            </div>
          </div>

          {collisions.length > 0 && (
            <div>
              <div className="text-sm mb-1" style={{ color: 'var(--c-coral)' }}>💥 겹친 수 (무효)</div>
              <div className="flex flex-wrap justify-center gap-2">
                {collisions.map((c) => (
                  <span key={c.num} className="clay-inset px-3 py-1.5 text-sm" style={{ background: 'var(--c-coral)', color: '#fff' }}>
                    {c.num} ×{c.pids.length} <span className="opacity-90">({c.pids.map((p) => nameOf(p)).join(', ')})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const picksRaw = useValue(`${base}/picks`)
  const maxNum = useValue(`${base}/maxNum`) || DEFAULT_MAX
  const nameOf = useNameOf(players)
  const mine = useValue(`${base}/picks/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const { unique, winner, picked, live } = useMemo(() => resolve(picksRaw, players), [picksRaw, players])

  const iWon = reveal && winner && winner.pid === me.id
  const myUnique = reveal && unique.some((u) => u.pid === me.id)
  const pick = (n) => { if (open) dbSet(`${base}/picks/${me.id}`, n) }

  if (reveal) {
    return (
      <div className="text-center">
        <div style={{ color: 'var(--ink-soft)' }}>내 숫자</div>
        <div className="font-display text-6xl">{mine ?? '—'}</div>
        {iWon ? (
          <p className="mt-3 font-display text-2xl animate-pop" style={{ color: 'var(--c-mint)' }}>🏆 최고 유니크! 승리 🎉</p>
        ) : myUnique ? (
          <p className="mt-3 font-display" style={{ color: 'var(--c-mint)' }}>✅ 유니크였지만 더 큰 수가 있었어요</p>
        ) : mine != null ? (
          <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 남과 겹쳐서 무효!</p>
        ) : (
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>이번 판은 안 골랐어요</p>
        )}
        {winner && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>승자: {winner.num} · {nameOf(winner.pid)}</p>}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {open ? `1~${maxNum} 중 하나를 골라요 · ${picked}/${live.length}명 선택` : '진행자 대기 중'}
      </div>
      <div className="mt-3 grid gap-2 max-w-md mx-auto" style={{ gridTemplateColumns: `repeat(${Math.min(maxNum, 5)}, 1fr)` }}>
        {Array.from({ length: maxNum }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => pick(n)} disabled={!open}
            className="clay-btn aspect-square rounded-2xl font-display text-2xl disabled:opacity-50"
            style={mine === n ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            {n}
          </button>
        ))}
      </div>
      {mine != null ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-grape)' }}>내 선택: {mine} · 공개 전까지 바꿀 수 있어요</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>큰 수일수록 유리하지만 겹치면 꽝! 🫣</p>
      )}
    </div>
  )
}

export default {
  id: 'uniquenum',
  name: '유니크 넘버',
  emoji: '🎯',
  tagline: '몰래 숫자 선택 · 최고 유니크가 승리',
  genres: ['mind'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
