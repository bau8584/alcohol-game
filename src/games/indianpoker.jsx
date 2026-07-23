// 인디언 포커 — 각자 비밀 숫자(1~99)를 받는다. '내 숫자만 나는 못 보고 남은 다 본다.'
// 남들 숫자와 표정을 읽고 콜(승부)/폴드(포기) 선택 → 공개하면 콜한 사람 중 최고 숫자가 승리,
// 콜했는데 최고가 아니면 벌칙, 폴드는 안전. 큰 화면(호스트)엔 진행 중 숫자를 숨긴다.
import { useEffect, useMemo } from 'react'
import { useValue, dbSet, dbTransaction } from '../lib/db'

// 서로 다른 1~99 숫자를 pid에 배분
function deal(pids) {
  const pool = Array.from({ length: 99 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const out = {}
  pids.forEach((pid, i) => { out[pid] = pool[i] })
  return out
}

function resolve(secrets, choiceRaw, players) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const entries = Object.entries(secrets || {}).filter(([pid]) => byId[pid])
  const choices = choiceRaw || {}
  const calls = entries.filter(([pid]) => choices[pid] === 'call').map(([pid, num]) => ({ pid, num }))
  const folds = entries.filter(([pid]) => choices[pid] === 'fold').map(([pid]) => pid)
  const decided = entries.filter(([pid]) => choices[pid]).length
  const winner = calls.length ? calls.reduce((a, b) => (b.num > a.num ? b : a)) : null
  const losers = winner ? calls.filter((c) => c.pid !== winner.pid) : []
  return { entries, calls, folds, decided, winner, losers, byId, N: entries.length, secrets: secrets || {}, choices }
}

function HostView({ base, meta, players }) {
  const secrets = useValue(`${base}/secrets`)
  const choiceRaw = useValue(`${base}/choice`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const st = useMemo(() => resolve(secrets, choiceRaw, players), [secrets, choiceRaw, players])
  const live = players.filter((p) => p.connected !== false)
  const nameOf = (pid) => st.byId[pid]?.nickname || '?'

  // 시작(open) 순간 아직 안 뽑았으면 배분 (트랜잭션 → 화면 여러 개여도 1회)
  useEffect(() => {
    if (open && secrets === null && live.length >= 2) {
      dbTransaction(`${base}/secrets`, (cur) => cur || deal(live.map((p) => p.id)))
    }
  }, [open, secrets, base, live.length])

  return (
    <div className="text-center">
      <div className="font-display text-xl">🎴 내 숫자만 나는 못 봐요</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>남들 숫자·표정 읽고 콜/폴드 · 콜한 사람 중 최고가 승리</div>

      {!open && !reveal && (
        <p className="mt-5 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>
          시작을 누르면 각자 폰에 '남들 숫자'가 떠요
          {live.length < 2 && <span className="block text-sm mt-1" style={{ color: 'var(--c-coral)' }}>2명 이상 필요</span>}
        </p>
      )}

      {open && (
        <div className="mt-5">
          <div className="text-6xl">🃏</div>
          <div className="mt-2" style={{ color: 'var(--ink-soft)' }}>
            결정한 사람 <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{st.decided}</span> / {st.N}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>숫자는 공개 전까지 큰 화면에 안 띄워요 🤫</div>
        </div>
      )}

      {reveal && (
        <div className="mt-4 space-y-3">
          {st.winner ? (
            <div className="clay p-4 animate-pop" style={{ background: 'var(--c-mint)', color: '#fff' }}>
              <div className="text-sm opacity-90">🏆 콜 최고 숫자 · 승리</div>
              <div className="font-display text-4xl">{st.winner.num} · {nameOf(st.winner.pid)}</div>
            </div>
          ) : (
            <div className="clay p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="font-display text-2xl">아무도 콜 안 함 😐</div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {st.entries.sort((a, b) => b[1] - a[1]).map(([pid, num]) => {
              const ch = st.choices[pid]
              const isWin = st.winner?.pid === pid
              const isLoser = st.losers.some((l) => l.pid === pid)
              const bg = isWin ? 'var(--c-mint)' : isLoser ? 'var(--c-coral)' : ch === 'fold' ? 'var(--surface-2)' : 'var(--surface)'
              const fg = isWin || isLoser ? '#fff' : 'var(--ink)'
              return (
                <span key={pid} className="clay-inset px-3 py-1.5 font-bold" style={{ background: bg, color: fg }}>
                  {num} · {nameOf(pid)} {ch === 'call' ? (isWin ? '🏆' : '💥콜') : ch === 'fold' ? '🏳️폴드' : '—'}
                </span>
              )
            })}
          </div>
          {st.losers.length > 0 && (
            <div className="text-sm" style={{ color: 'var(--c-coral)' }}>💥 콜했다가 진 사람: {st.losers.map((l) => nameOf(l.pid)).join(', ')} · 벌칙 🍺</div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const secrets = useValue(`${base}/secrets`)
  const mine = useValue(`${base}/choice/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const others = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    return Object.entries(secrets || {}).filter(([pid]) => pid !== me.id && byId[pid]).map(([pid, num]) => ({ num, name: byId[pid]?.nickname || '?' })).sort((a, b) => b.num - a.num)
  }, [secrets, players, me.id])
  const started = secrets?.[me.id] != null
  const myNum = secrets?.[me.id]

  const choose = (c) => { if (open && started) dbSet(`${base}/choice/${me.id}`, c) }

  if (!started) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🎴</div>
        <p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 남들 숫자가 보여요</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>👀 남들 숫자 (내 것은 비밀)</div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {others.map((o, i) => (
          <span key={i} className="clay-inset px-3 py-1.5 font-display text-lg">{o.name} <b>{o.num}</b></span>
        ))}
      </div>

      <div className="mt-4 clay-inset py-6" style={{ background: 'var(--surface-2)' }}>
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>내 숫자</div>
        <div className="font-display text-6xl" style={{ color: 'var(--c-grape)' }}>{reveal ? myNum : '❓'}</div>
      </div>

      {reveal ? (
        <p className="mt-3 font-display text-xl" style={{ color: mine === 'call' ? 'var(--ink)' : 'var(--ink-soft)' }}>
          내 숫자는 <b>{myNum}</b> · {mine === 'call' ? '콜했어요' : mine === 'fold' ? '폴드(안전)' : '미결정'}
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button onClick={() => choose('call')} disabled={!open} className="flex-1 clay-btn py-4 font-display text-xl disabled:opacity-50"
              style={mine === 'call' ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              ✅ 콜 (승부)
            </button>
            <button onClick={() => choose('fold')} disabled={!open} className="flex-1 clay-btn py-4 font-display text-xl disabled:opacity-50"
              style={mine === 'fold' ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              🏳️ 폴드 (포기)
            </button>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {mine ? '공개 전까지 바꿀 수 있어요' : '남들이 다 낮으면 내가 높을지도? 🤔'}
          </p>
        </>
      )}
    </div>
  )
}

export default {
  id: 'indianpoker',
  name: '인디언 포커',
  emoji: '🎴',
  tagline: '내 숫자만 못 봄 · 콜/폴드 눈치 승부',
  genres: ['mind'],
  traits: ['solo'],
  controls: { startLabel: '🃏 시작', resetLabel: '🔄 새 판' },
  HostView,
  PlayerView,
}
