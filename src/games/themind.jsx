// 무언의 순서 (더 마인드) — 각자 비밀 숫자(1~100)를 받고, 말없이 '작은 수부터' 순서대로 누른다.
// 누른 순서가 오름차순이면 전원 통과(협동 성공). 누군가 더 작은 수를 쥔 채 남이 먼저 누르면 실패.
// 유일한 협동 게임. 서버 ts로 누른 순서를 판정(눈치게임과 동일 방식).
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList, SERVER_TS } from '../lib/db'
import { Button } from '../components/ui'

// 1~100 중 n개 서로 다른 수를 뽑아 pid에 배정
function deal(pids) {
  const pool = Array.from({ length: 100 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const out = {}
  pids.forEach((pid, i) => { out[pid] = pool[i] })
  return out
}

// secrets + presses(서버 ts) → 진행 상태 판정
function resolve(secrets, pressRaw, players) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const entries = Object.entries(secrets || {}).filter(([pid]) => byId[pid])
  const N = entries.length
  const correct = entries.sort((a, b) => a[1] - b[1]).map(([pid]) => pid) // 정답 순서(오름차순)

  const seen = new Set()
  const pressed = toList(pressRaw)
    .filter((p) => typeof p.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
    .map((p) => p.pid)
    .filter((pid) => secrets?.[pid] != null && (seen.has(pid) ? false : (seen.add(pid), true)))

  // 첫 불일치 지점 = 실패 지점
  let failAt = -1
  for (let i = 0; i < pressed.length; i++) {
    if (pressed[i] !== correct[i]) { failAt = i; break }
  }
  const failed = failAt >= 0
  const done = !failed && pressed.length >= N && N > 0
  const culpritPid = failed ? pressed[failAt] : null // 성급하게 누른 사람
  const shouldPid = failed ? correct[failAt] : null // 더 작은 수를 쥐고 있던 사람
  return { N, correct, pressed, failed, done, culpritPid, shouldPid, byId, secrets: secrets || {} }
}

function HostView({ base, players }) {
  const secrets = useValue(`${base}/secrets`)
  const pressRaw = useValue(`${base}/presses`)
  const st = useMemo(() => resolve(secrets, pressRaw, players), [secrets, pressRaw, players])
  const started = !!secrets
  const live = players.filter((p) => p.connected !== false)
  const nameOf = (pid) => st.byId[pid]?.nickname || '?'

  const start = () => {
    if (live.length < 2) return
    dbUpdate(base, { secrets: deal(live.map((p) => p.id)), presses: null })
  }
  const reset = () => dbUpdate(base, { secrets: null, presses: null })

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ok" onClick={start} disabled={live.length < 2}>{started ? '🔄 새 판' : '🤫 시작'}</Button>
        {started && <Button variant="ghost" onClick={reset}>■ 정지</Button>}
      </div>

      {!started ? (
        <p className="mt-5 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>
          말없이 작은 수부터 순서대로! 전원 통과하면 협동 성공 🤝
          {live.length < 2 && <span className="block text-sm mt-1" style={{ color: 'var(--c-coral)' }}>2명 이상 필요</span>}
        </p>
      ) : st.failed ? (
        <div className="mt-4">
          <div className="clay p-4 animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
            <div className="font-display text-3xl">💥 실패!</div>
            <div className="text-sm mt-1 opacity-95">
              <b>{nameOf(st.shouldPid)}</b>({st.secrets[st.shouldPid]})가 더 작았는데 <b>{nameOf(st.culpritPid)}</b>({st.secrets[st.culpritPid]})가 먼저 눌렀어요
            </div>
          </div>
        </div>
      ) : st.done ? (
        <div className="mt-4 clay p-4 animate-pop" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="font-display text-3xl">🎉 전원 통과!</div>
          <div className="text-sm mt-1 opacity-95">완벽한 텔레파시 · 협동 성공</div>
        </div>
      ) : (
        <div className="mt-4" style={{ color: 'var(--ink-soft)' }}>
          누른 사람 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{st.pressed.length}</span> / {st.N}
          <div className="text-sm mt-1">지금까지 오름차순 유지 중… 🤫</div>
        </div>
      )}

      {/* 누른 순서 공개 (숫자 표시) */}
      {started && st.pressed.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {st.pressed.map((pid, i) => {
            const bad = st.failed && i === st.pressed.length - 1 && pid === st.culpritPid
            return (
              <span key={pid} className="clay-inset px-3 py-1.5 font-bold" style={bad ? { background: 'var(--c-coral)', color: '#fff' } : {}}>
                {st.secrets[pid]} · {nameOf(pid)}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, players, me }) {
  const secrets = useValue(`${base}/secrets`)
  const pressRaw = useValue(`${base}/presses`)
  const st = useMemo(() => resolve(secrets, pressRaw, players), [secrets, pressRaw, players])
  const myNum = secrets?.[me.id]
  const started = myNum != null
  const iPressed = st.pressed.includes(me.id)
  const active = started && !st.failed && !st.done && !iPressed

  const press = () => {
    if (!active) return
    dbPush(`${base}/presses`, { pid: me.id, ts: SERVER_TS })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  if (!started) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 비밀 숫자가 나와요</p>
      </div>
    )
  }

  let label = `내 숫자 ${myNum}`
  let bg = 'var(--c-grape)'
  if (st.failed) { label = '💥 실패'; bg = 'var(--c-coral)' }
  else if (st.done) { label = '🎉 성공!'; bg = 'var(--c-mint)' }
  else if (iPressed) { label = '✋ 눌렀다'; bg = 'var(--c-mint)' }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>
        {st.failed ? '실패…' : st.done ? '성공!' : `${st.pressed.length}/${st.N}명 누름 · 내 차례일까?`}
      </div>
      <button onPointerDown={press} disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display clay-btn transition-colors flex flex-col items-center justify-center"
        style={{ background: bg, color: '#fff' }}>
        <div className="text-2xl opacity-90">내 비밀 숫자</div>
        <div className="text-7xl">{myNum}</div>
        <div className="text-2xl mt-2">{st.failed ? '💥' : st.done ? '🎉' : iPressed ? '✋ 눌렀다' : '지금 누를까?'}</div>
      </button>
      {st.failed ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>순서가 틀렸어요 💥</p>
      ) : st.done ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-mint)' }}>전원 통과! 🎉</p>
      ) : iPressed ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>다음 사람을 기다려요…</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>내 숫자가 제일 작을 것 같으면 눌러요 · 말 금지!</p>
      )}
    </div>
  )
}

export default {
  id: 'themind',
  name: '무언의 순서',
  emoji: '🤫',
  tagline: '협동 · 말없이 작은 수부터 순서대로',
  genres: ['mind'],
  traits: [],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
