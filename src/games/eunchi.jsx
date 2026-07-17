// 눈치게임 — 숨은 번호. 시작 시 1..N 중 '걸리는 번호'가 비밀로 뽑혀 잠긴다(호스트도 공개 전엔 못 봄).
// 참가자는 눈치보며 아무 때나 딱 한 번 터치 → 누른 순서대로 1, 2, 3… 번호가 배정된다.
// 공개하면 숨은 번호가 드러나고, 그 번호를 가진 사람이 벌칙. 끝까지 안 누른 사람도 벌칙.
// 서버 ts는 '순서'를 정할 때만 쓰고 걸림 판정에는 안 쓰이므로, 지연 때문에 억울하게 걸리는 일이 없다.
import { useEffect, useMemo } from 'react'
import { useValue, useChildList, dbPush, dbSet, dbTransaction, SERVER_TS } from '../lib/db'

const HIT_COUNTS = [1, 2, 3]

// 1..n 중 k개를 섞어서 뽑기 → { nums: '3,7', n }
function draw(n, k) {
  const pool = Array.from({ length: n }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const nums = pool.slice(0, Math.min(k, n)).sort((a, b) => a - b)
  return { nums: nums.join(','), n }
}

// taps(서버 ts) → 누른 순서대로 번호 배정. 한 사람은 첫 탭만 인정.
function order(tapsList) {
  const seen = new Set()
  return tapsList
    .filter((t) => typeof t.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
    .filter((t) => (seen.has(t.pid) ? false : (seen.add(t.pid), true)))
    .map((t, i) => ({ ...t, k: i + 1 }))
}

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

// 숨은 번호 + 순서 배정을 한 번에 계산 (Host/Player 공용)
function useResolve({ base, meta, players }) {
  const tapsList = useChildList(`${base}/taps`)
  const secret = useValue(`${base}/secret`)
  const hits = useValue(`${base}/hits`) || 1
  const live = players.filter((p) => p.connected !== false)
  const N = secret?.n || live.length
  const ordered = useMemo(() => order(tapsList), [tapsList])
  const hitNums = useMemo(() => (secret?.nums ? secret.nums.split(',').map(Number) : []), [secret])
  const pressedIds = useMemo(() => new Set(ordered.map((o) => o.pid)), [ordered])
  const reveal = meta.roundStatus === 'reveal'
  const caught = reveal ? ordered.filter((o) => hitNums.includes(o.k)) : []
  const noShow = reveal ? live.filter((p) => !pressedIds.has(p.id)) : []
  return { tapsList, secret, hits, N, ordered, hitNums, pressedIds, reveal, caught, noShow, live }
}

function HostView({ base, meta, players }) {
  const { secret, hits, N, ordered, hitNums, reveal, caught, noShow, live } = useResolve({ base, meta, players })
  const nameOf = useNameOf(players)
  const open = meta.roundStatus === 'open'

  // 시작하는 순간 숨은 번호를 뽑아 잠근다. 트랜잭션이라 화면이 여러 개여도 한 번만 뽑힘.
  useEffect(() => {
    if (!open || secret !== null || live.length < 2) return
    dbTransaction(`${base}/secret`, (cur) => cur || draw(live.length, hits))
  }, [open, secret, base, hits, live.length])

  const idle = !open && !reveal

  return (
    <div className="text-center">
      <div className="font-display text-xl">🔢 눈치보며 딱 한 번 터치!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
        누른 순서대로 번호 배정 · 숨은 번호에 걸리면 벌칙 🍺
      </div>

      {idle && (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>걸리는 사람 수</div>
          <div className="flex justify-center gap-2">
            {HIT_COUNTS.map((n) => (
              <button key={n} onClick={() => dbSet(`${base}/hits`, n)} className="clay-btn px-4 py-2 font-display"
                style={hits === n ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {n}명
              </button>
            ))}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
            현재 {live.length}명 · 시작하면 1~{live.length} 중 {hits}개가 비밀로 잠깁니다
          </div>
          {live.length < 2 && <div className="text-xs mt-1" style={{ color: 'var(--c-coral)' }}>2명 이상 있어야 시작할 수 있어요</div>}
        </div>
      )}

      {open && (
        <>
          <div className="mt-4 font-display text-2xl" style={{ color: 'var(--c-grape)' }}>🔒 숨은 번호 {hits}개 · 잠김</div>
          <div className="mt-1" style={{ color: 'var(--ink-soft)' }}>
            누른 사람 <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{ordered.length}</span> / {N}
          </div>
        </>
      )}

      {reveal && (
        <div className="mt-4">
          <div style={{ color: 'var(--ink-soft)' }}>숨은 번호</div>
          <div className="font-display text-6xl animate-pop" style={{ color: 'var(--c-coral)' }}>{hitNums.join('  ·  ') || '—'}</div>
        </div>
      )}

      {/* 누른 순서 — 공개되면 걸린 번호가 빨갛게 */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {ordered.map((o) => {
          const hit = reveal && hitNums.includes(o.k)
          return (
            <span key={o.id} className={`clay-inset px-3 py-1.5 font-bold ${hit ? 'animate-pop' : ''}`}
              style={hit ? { background: 'var(--c-coral)', color: '#fff' } : undefined}>
              {hit && '💥 '}{o.k}. {nameOf(o.pid)}
            </span>
          )
        })}
        {!ordered.length && <p className="py-6" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 눌렀어요. 🤫</p>}
      </div>

      {reveal && (
        <div className="mt-5 grid gap-3 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="clay p-3" style={{ background: 'var(--c-coral)', color: '#fff' }}>
            <div className="font-display text-lg">💥 걸린 사람 · {caught.length}명</div>
            <div className="text-sm mt-1 opacity-90">{caught.map((c) => `${c.k}. ${nameOf(c.pid)}`).join(', ') || '아무도 안 걸렸어요 (그 번호는 빈 자리)'}</div>
          </div>
          <div className="clay p-3" style={{ background: 'var(--c-grape)', color: '#fff' }}>
            <div className="font-display text-lg">🙈 끝까지 안 누른 사람 · {noShow.length}명</div>
            <div className="text-sm mt-1 opacity-90">{noShow.map((p) => p.nickname).join(', ') || '전원 참여!'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const { N, ordered, hitNums, hits, reveal, secret } = useResolve({ base, meta, players })
  const open = meta.roundStatus === 'open'
  const mine = ordered.find((o) => o.pid === me.id)
  const pressed = !!mine
  const active = open && !pressed && !!secret
  const hit = reveal && mine && hitNums.includes(mine.k)
  const noShow = reveal && !pressed

  const press = () => {
    if (!active) return
    dbPush(`${base}/taps`, { pid: me.id, ts: SERVER_TS })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  let label = '대기'
  if (hit) label = '💥 걸렸다!'
  else if (noShow) label = '🙈 미참여'
  else if (reveal && pressed) label = `${mine.k}번 · 안전 ✅`
  else if (pressed) label = `내 번호 ${mine.k}`
  else if (active) label = '🫣 지금 누르기'

  const bg = hit || noShow ? 'var(--c-coral)' : reveal && pressed ? 'var(--c-mint)' : active ? 'var(--c-grape)' : pressed ? 'var(--c-mint)' : 'var(--surface-2)'
  const fg = hit || noShow || active || pressed ? '#fff' : 'var(--ink-soft)'

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {reveal ? `숨은 번호 ${hitNums.join(', ')}` : open ? `${ordered.length} / ${N}명이 눌렀어요` : '진행자 대기 중'}
      </div>
      <button onPointerDown={press} disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn transition-colors"
        style={{ background: bg, color: fg }}>
        {label}
      </button>
      {hit ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>💥 {mine.k}번이 숨은 번호였어요! 벌칙 🍺</p>
      ) : noShow ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>끝까지 안 눌렀네요… 미참여 벌칙 🍺</p>
      ) : reveal ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>살았다! 🎉</p>
      ) : pressed ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{mine.k}번 확정 · 공개까지 기도하세요 🙏</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>1~{N}번 중 {hits}개가 걸립니다 · 몇 번째로 들어갈지는 당신 몫 🫣</p>
      )}
    </div>
  )
}

export default {
  id: 'eunchi',
  name: '눈치게임',
  emoji: '🔢',
  tagline: '숨은 번호 · 몇 번째로 누를까',
  genres: ['mind'],
  traits: ['solo'],
  controls: { prompt: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임' },
  HostView,
  PlayerView,
}
