// 진선미 — 익명 질문 + 심사. 질문자가 특정인을 지목해 익명 질문을 보내면,
// 지목당한 사람이 전체 목록에서 진(🥇)·선(🥈)·미(🥉)를 뽑는다.
// 호스트 화면엔 '진선미'만 공개되고 '질문'은 비공개. 궁금하면 벌칙을 수행하고
// 호스트가 그 사람 이름을 눌러야 그 사람 폰에만 질문이 열린다.
import { useState } from 'react'
import { useValue, dbSet, dbRemove, dbTransaction, SERVER_TS } from '../lib/db'
import { Button } from '../components/ui'

const SLOTS = [
  { key: 'jin', label: '진', medal: '🥇', color: 'var(--c-coral)' },
  { key: 'seon', label: '선', medal: '🥈', color: 'var(--c-grape)' },
  { key: 'mi', label: '미', medal: '🥉', color: 'var(--c-sky)' },
]

// ───────────────────────── 호스트 화면 ─────────────────────────
function HostView({ base, players }) {
  const q = useValue(`${base}/q`)
  const asker = useValue(`${base}/asker`)
  const pick = useValue(`${base}/pick`)
  const reveals = useValue(`${base}/reveals`)
  const wants = useValue(`${base}/wants`)
  const nameOf = (id) => players.find((p) => p.id === id)?.nickname || '—'

  // 아직 질문 전 → 호스트가 질문자를 지정
  if (!q) {
    return (
      <div className="text-center">
        {asker ? (
          <div className="py-6">
            <div style={{ color: 'var(--ink-soft)' }}>질문자 지정됨 · 익명 질문 작성 중…</div>
            <div className="font-display text-4xl mt-1 animate-pop">✍️ {asker.nick}</div>
            <button
              onClick={() => dbRemove(`${base}/asker`)}
              className="clay-btn mt-4 px-4 py-2 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
            >
              ↩ 질문자 다시 고르기
            </button>
          </div>
        ) : (
          <>
            <p className="font-display text-xl mb-3">💌 누가 익명 질문을 보낼까요?</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dbSet(`${base}/asker`, { id: p.id, nick: p.nickname })}
                  className="clay-btn px-3 py-1.5 font-bold"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  {p.nickname}
                </button>
              ))}
              {players.length === 0 && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  // 질문자·지목대상은 이미 질문을 알고 있으니 열람 대상에서 제외
  const audience = players.filter((p) => p.id !== q.askerId && p.id !== q.targetId)

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>익명의 질문을 받은 사람</div>
      <div className="font-display text-4xl mt-1 animate-pop">🎯 {q.targetNick}</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>❓ 질문은 비공개 · 궁금하면 벌칙!</div>

      <div className="mt-5 grid grid-cols-3 gap-3 max-w-lg mx-auto">
        {SLOTS.map((s) => (
          <div key={s.key} className="clay-inset py-4">
            <div className="text-3xl">{s.medal}</div>
            <div className="font-display text-lg" style={{ color: s.color }}>{s.label}</div>
            <div className="font-display text-2xl mt-1">{pick?.[s.key] ? nameOf(pick[s.key]) : '…'}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-lg mx-auto text-left">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>
          🍺 벌칙 수행 확인 후 이름을 누르면 그 사람 폰에 질문이 열립니다
        </div>
        {audience.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>열람 가능한 관객이 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {audience.map((p) => {
              const on = !!reveals?.[p.id]
              const want = !!wants?.[p.id]
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    on
                      ? dbRemove(`${base}/reveals/${p.id}`)
                      : (dbSet(`${base}/reveals/${p.id}`, true), dbRemove(`${base}/wants/${p.id}`))
                  }
                  className="clay-btn px-3 py-1.5 text-sm font-bold"
                  style={{
                    background: on ? 'var(--c-mint)' : want ? 'var(--c-coral)' : 'var(--surface-2)',
                    color: on || want ? '#fff' : 'var(--ink)',
                  }}
                >
                  {on ? '✅ ' : want ? '🍺 ' : ''}{p.nickname}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── 질문 작성 (질문자) ─────────────────────────
function Compose({ base, players, me }) {
  const [target, setTarget] = useState(null)
  const [text, setText] = useState('')
  const candidates = players.filter((p) => p.id !== me.id)

  const send = () => {
    if (!target) return alert('질문할 상대를 고르세요.')
    if (!text.trim()) return alert('질문을 입력하세요.')
    const t = candidates.find((p) => p.id === target)
    if (!t) return
    dbTransaction(`${base}/q`, (cur) =>
      cur
        ? undefined // 이미 다른 사람이 먼저 질문함 → 취소
        : { askerId: me.id, askerNick: me.nickname, targetId: t.id, targetNick: t.nickname, text: text.trim(), ts: SERVER_TS }
    )
  }

  return (
    <div>
      <p className="text-center mb-3 font-display text-lg">💌 누구에게 익명 질문을 보낼까요?</p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => setTarget(p.id)}
            className="clay-btn py-3 font-display text-lg"
            style={target === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}
          </button>
        ))}
        {candidates.length === 0 && <p className="col-span-2 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>다른 참가자가 없어요.</p>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="익명 질문 (예: 여기서 제일 좋아하는 사람 진선미는?)"
        rows={3}
        className="clay-inset w-full px-4 py-3 mt-3 resize-none"
      />
      <Button className="w-full mt-3" onClick={send}>🤫 익명으로 보내기</Button>
      <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>질문자는 끝까지 비밀이에요.</p>
    </div>
  )
}

// ───────────────────────── 진선미 심사 (지목당한 사람) ─────────────────────────
function Judge({ base, q, players, me }) {
  const pick = useValue(`${base}/pick`)
  const candidates = players.filter((p) => p.id !== me.id)
  const needed = Math.min(3, candidates.length)
  const filled = SLOTS.filter((s) => pick?.[s.key]).length

  const slotOf = (id) => SLOTS.find((s) => pick?.[s.key] === id)
  const tap = (id) => {
    const s = slotOf(id)
    if (s) return dbRemove(`${base}/pick/${s.key}`) // 이미 선택됨 → 해제
    const empty = SLOTS.find((x) => !pick?.[x.key])
    if (empty) dbSet(`${base}/pick/${empty.key}`, id)
  }

  return (
    <div>
      <div className="clay-inset p-4 mb-4 text-center">
        <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>익명의 질문 🤫</div>
        <div className="font-display text-lg mt-1">{q.text}</div>
      </div>
      <p className="text-center mb-2" style={{ color: 'var(--ink-soft)' }}>
        전체 중에서 <b style={{ color: 'var(--c-coral)' }}>진</b>·<b style={{ color: 'var(--c-grape)' }}>선</b>·<b style={{ color: 'var(--c-sky)' }}>미</b>를 뽑아주세요 ({filled}/{needed})
      </p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((p) => {
          const s = slotOf(p.id)
          return (
            <button
              key={p.id}
              onClick={() => tap(p.id)}
              className="clay-btn py-3 font-display text-lg flex items-center justify-center gap-1.5"
              style={s ? { background: s.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {s && <span>{s.medal}</span>}{p.nickname}
            </button>
          )
        })}
      </div>
      {filled >= needed ? (
        <p className="mt-3 text-center font-display" style={{ color: 'var(--c-mint)' }}>선정 완료! 메인 화면 확인 ✨ (다시 눌러 변경 가능)</p>
      ) : (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>이름을 누르면 진→선→미 순서로 채워져요. 다시 누르면 해제.</p>
      )}
    </div>
  )
}

// ───────────────────────── 관객 (질문 열람 대기) ─────────────────────────
function Audience({ base, q, me }) {
  const reveals = useValue(`${base}/reveals`)
  const wants = useValue(`${base}/wants`)
  const revealed = !!reveals?.[me.id]
  const wanted = !!wants?.[me.id]

  if (revealed) {
    return (
      <div className="clay p-6 text-center" style={{ background: 'var(--c-grape)', color: '#fff' }}>
        <div className="opacity-80 text-sm">🔓 열린 질문 (벌칙 완료!)</div>
        <div className="font-display text-2xl mt-2">{q.text}</div>
        <div className="mt-2 text-xs opacity-80">→ {q.targetNick} 에게 물은 익명 질문</div>
      </div>
    )
  }
  return (
    <div className="text-center">
      <div className="text-5xl">🙈</div>
      <p className="mt-3 font-display text-xl">질문은 비공개!</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{q.targetNick} 의 진선미는 메인 화면에서 확인하세요.</p>
      {wanted ? (
        <p className="mt-4 font-display" style={{ color: 'var(--c-coral)' }}>🍺 벌칙 수행 후 호스트가 열어줄 거예요…</p>
      ) : (
        <Button variant="warn" className="w-full mt-4 py-4" onClick={() => dbSet(`${base}/wants/${me.id}`, true)}>
          🍺 벌칙하고 질문 볼래요
        </Button>
      )}
    </div>
  )
}

// ───────────────────────── 플레이어 화면 라우터 ─────────────────────────
function PlayerView({ base, players, me }) {
  const q = useValue(`${base}/q`)
  const asker = useValue(`${base}/asker`)

  // 아직 질문 전 → 호스트가 고른 질문자만 작성, 나머지는 대기
  if (!q) {
    if (!asker) {
      return (
        <div className="text-center py-10">
          <div className="text-5xl">🤫</div>
          <p className="mt-3 font-display text-xl">호스트가 질문자를 고르는 중…</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
        </div>
      )
    }
    if (asker.id === me.id) return <Compose base={base} players={players} me={me} />
    return (
      <div className="text-center py-10">
        <div className="text-5xl">✍️</div>
        <p className="mt-3 font-display text-xl">{asker.nick} 님이 익명 질문을 준비 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>잠시만 기다려 주세요!</p>
      </div>
    )
  }

  if (me.id === q.targetId) return <Judge base={base} q={q} players={players} me={me} />
  if (me.id === q.askerId) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl">익명 질문 전송 완료!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>당신이 질문자란 건 비밀 · {q.targetNick} 의 진선미를 기다려요.</p>
      </div>
    )
  }
  return <Audience base={base} q={q} me={me} />
}

export default {
  id: 'jinseonmi',
  name: '진선미',
  emoji: '👑',
  tagline: '익명 질문 · 진선미 심사 · 질문은 벌칙으로!',
  genres: ['party'],
  traits: ['anon'],
  controls: { prompt: false, reveal: false, mode: 'reset', resetLabel: '🔄 새 질문' },
  HostView,
  PlayerView,
}
