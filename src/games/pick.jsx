// ② 고르기 — 모드: person(사람 지목, 득표 게이지) / ab(A·B 밸런스, 팀 싱크율)
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import ModeTabs from '../components/ModeTabs'

const MODES = [
  { id: 'person', label: '사람 지목', emoji: '🎯' },
  { id: 'ab', label: 'A·B 밸런스', emoji: '⚖️' },
]

/* ── 사람 지목 ── */
function PersonHost({ base, meta, players }) {
  const raw = useValue(`${base}/pick`)
  const ranked = useMemo(() => {
    const counts = {}
    toList(raw).forEach((p) => (counts[p.value] = (counts[p.value] || 0) + 1))
    return players.map((p) => ({ ...p, votes: counts[p.id] || 0 })).sort((a, b) => b.votes - a.votes)
  }, [raw, players])
  const total = toList(raw).length
  const max = Math.max(1, ...ranked.map((r) => r.votes))
  const top = ranked[0]?.votes > 0 ? ranked[0] : null
  return (
    <div>
      <div className="flex justify-between text-sm" style={{ color: 'var(--ink-soft)' }}>
        <span>{meta.prompt || '질문을 입력하세요'}</span>
        <span>{total}/{players.length}</span>
      </div>
      {top && <div className="text-center mt-2"><span style={{ color: 'var(--ink-soft)' }}>최다 </span><span className="font-display text-3xl">{top.nickname}</span></div>}
      <div className="mt-3 space-y-2 max-w-lg mx-auto">
        {ranked.filter((r) => r.votes > 0).map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-24 truncate text-right font-bold">{r.nickname}</span>
            <div className="flex-1 h-7 clay-inset overflow-hidden relative">
              <div className="absolute inset-y-1 left-1 rounded-full flex items-center justify-end pr-2 text-sm font-bold text-white transition-all duration-500" style={{ width: `calc(${(r.votes / max) * 100}% - 8px)`, background: 'var(--c-grape)' }}>{r.votes}</div>
            </div>
          </div>
        ))}
        {!top && <p className="text-center py-6" style={{ color: 'var(--ink-soft)' }}>아직 지목이 없어요.</p>}
      </div>
    </div>
  )
}

function PersonPlayer({ base, meta, players, me }) {
  const myPick = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  return (
    <div>
      <p className="text-center mb-3" style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '지목할 사람'}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => open && dbSet(`${base}/pick/${me.id}`, p.id)}
            disabled={!open}
            className="clay-btn py-3 font-display text-lg"
            style={myPick === p.id ? { background: 'var(--c-grape)' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}{p.id === me.id && ' (나)'}
          </button>
        ))}
      </div>
      {myPick && <p className="mt-3 text-center text-sm" style={{ color: 'var(--c-mint)' }}>지목 완료 · 변경 가능</p>}
    </div>
  )
}

/* ── A·B 밸런스 ── */
function AbHost({ base, meta, teams }) {
  const raw = useValue(`${base}/choice`)
  const stats = useMemo(() => {
    const pick = Object.fromEntries(toList(raw).map((c) => [c.id, c.value]))
    return teams.map((t) => {
      const ans = t.members.map((m) => pick[m.id]).filter(Boolean)
      const a = ans.filter((x) => x === 'A').length
      const b = ans.filter((x) => x === 'B').length
      const sync = ans.length ? Math.round((Math.max(a, b) / ans.length) * 100) : 0
      return { ...t, a, b, answered: ans.length, sync }
    })
  }, [raw, teams])
  const reveal = meta.roundStatus === 'reveal'
  const answered = stats.filter((s) => s.answered > 0)
  const loser = reveal && answered.length ? [...answered].sort((x, y) => x.sync - y.sync)[0] : null
  return (
    <div className="text-center">
      <div className="font-display text-2xl">{meta.prompt || '밸런스 질문'}</div>
      <div className="mt-4 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
        {stats.map((s) => (
          <div key={s.id} className="clay p-3" style={{ background: 'var(--surface)' }}>
            <div className="font-display" style={{ color: s.color }}>{s.emoji} {s.name}</div>
            {reveal ? (
              <>
                <div className="font-display text-4xl mt-1">{s.sync}%</div>
                <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>A {s.a} · B {s.b}</div>
                {loser?.id === s.id && <div className="mt-1 font-bold" style={{ color: 'var(--c-coral)' }}>🍺 벌칙</div>}
              </>
            ) : (
              <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{s.answered}/{s.members.length}</div>
            )}
          </div>
        ))}
      </div>
      {!reveal && <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>응답 수집 중…</p>}
    </div>
  )
}

function AbPlayer({ base, meta, me }) {
  const mine = useValue(`${base}/choice/${me.id}`)
  const open = meta.roundStatus === 'open'
  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '팀원과 같은 선택을!'}</p>
      <div className="grid grid-cols-2 gap-3">
        {['A', 'B'].map((v, i) => (
          <button
            key={v}
            onClick={() => open && dbSet(`${base}/choice/${me.id}`, v)}
            disabled={!open}
            className="h-40 rounded-3xl font-display text-5xl clay-btn"
            style={mine === v ? { background: i === 0 ? 'var(--c-sky)' : 'var(--c-pink)' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {v}
          </button>
        ))}
      </div>
      {mine && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>선택: {mine}</p>}
    </div>
  )
}

/* ── 래퍼 ── */
function HostView({ base, meta, players, teams }) {
  const mode = useValue(`${base}/mode`) || 'person'
  return (
    <div>
      {meta.roundStatus === 'staged' && (
        <div className="text-center mb-4">
          <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
        </div>
      )}
      {mode === 'person' ? <PersonHost base={base} meta={meta} players={players} /> : <AbHost base={base} meta={meta} teams={teams} />}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const mode = useValue(`${base}/mode`) || 'person'
  return mode === 'person' ? <PersonPlayer base={base} meta={meta} players={players} me={me} /> : <AbPlayer base={base} meta={meta} me={me} />
}

export default {
  id: 'pick',
  name: '고르기',
  emoji: '🎯',
  tagline: '지목 · 밸런스',
  promptLabel: '질문 (예: 오늘 제일 취할 것 같은 사람?)',
  HostView,
  PlayerView,
}
