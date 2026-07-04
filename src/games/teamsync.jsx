// 8. 동기화 센서 — A/B 밸런스 선택, 팀별 싱크율. 최저 싱크 팀이 벌칙.
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

function teamStats(choiceRaw, teams) {
  const pick = Object.fromEntries(toList(choiceRaw).map((c) => [c.id, c.value]))
  return teams.map((t) => {
    const ans = t.members.map((m) => pick[m.id]).filter(Boolean)
    const a = ans.filter((x) => x === 'A').length
    const b = ans.filter((x) => x === 'B').length
    const sync = ans.length ? Math.round((Math.max(a, b) / ans.length) * 100) : 0
    return { ...t, a, b, answered: ans.length, sync }
  })
}

function HostView({ base, meta, teams }) {
  const choiceRaw = useValue(`${base}/choice`)
  const stats = useMemo(() => teamStats(choiceRaw, teams), [choiceRaw, teams])
  const reveal = meta.roundStatus === 'reveal'
  const answered = teams.some((t) => t.members.length)
    ? stats.filter((s) => s.answered > 0)
    : []
  const loser = reveal && answered.length ? [...stats].sort((x, y) => x.sync - y.sync)[0] : null

  return (
    <div className="text-center">
      <div className="text-2xl font-black">{meta.prompt || '밸런스 질문을 입력하세요'}</div>
      <div className="mt-1 text-white/50">A vs B</div>
      <div className="mt-4 grid grid-cols-3 gap-3 max-w-3xl mx-auto">
        {stats.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl p-3 border"
            style={{ borderColor: s.color + '55', background: s.color + '11' }}
          >
            <div className="font-black" style={{ color: s.color }}>
              {s.emoji} {s.name}
            </div>
            {reveal ? (
              <>
                <div className="mt-1 text-4xl font-black">{s.sync}%</div>
                <div className="text-sm text-white/60">
                  A {s.a} · B {s.b}
                </div>
                {loser?.id === s.id && <div className="mt-1 text-rose-400 font-bold">🍺 벌칙 팀</div>}
              </>
            ) : (
              <div className="mt-2 text-white/50 text-sm">{s.answered}/{s.members.length} 응답</div>
            )}
          </div>
        ))}
      </div>
      {!reveal && <p className="mt-4 text-white/40 animate-pulse">응답 수집 중… ‘공개’로 싱크율 표시</p>}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mine = useValue(`${base}/choice/${me.id}`)
  const open = meta.roundStatus === 'open'
  const choose = (v) => open && dbSet(`${base}/choice/${me.id}`, v)

  return (
    <div className="text-center">
      <p className="text-white/60 mb-3">{meta.prompt || '팀원과 같은 선택을!'}</p>
      <div className="grid grid-cols-2 gap-3">
        {['A', 'B'].map((v) => (
          <button
            key={v}
            onClick={() => choose(v)}
            disabled={!open}
            className={`h-40 rounded-2xl text-5xl font-black border-2 transition active:scale-95 ${
              mine === v ? 'bg-indigo-500 border-indigo-300' : 'bg-white/5 border-white/10'
            } disabled:opacity-40`}
          >
            {v}
          </button>
        ))}
      </div>
      {mine && <p className="mt-3 text-emerald-400 text-sm">선택: {mine} · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'teamsync',
  name: '동기화 센서',
  emoji: '📡',
  tagline: '팀별 A/B 싱크율',
  promptLabel: '밸런스 질문 (A / B)',
  HostView,
  PlayerView,
}
