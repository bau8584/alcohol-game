// 2. 팀원 지목 — 각자 1명 지목, Host 에 실시간 득표 게이지.
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { TeamBadge } from '../components/ui'

function tally(pickRaw, players) {
  const counts = {}
  toList(pickRaw).forEach((p) => {
    counts[p.value] = (counts[p.value] || 0) + 1
  })
  return players
    .map((p) => ({ ...p, votes: counts[p.id] || 0 }))
    .sort((a, b) => b.votes - a.votes)
}

function HostView({ base, meta, players }) {
  const pickRaw = useValue(`${base}/pick`)
  const ranked = useMemo(() => tally(pickRaw, players), [pickRaw, players])
  const total = toList(pickRaw).length
  const max = Math.max(1, ...ranked.map((r) => r.votes))
  const top = ranked[0]?.votes > 0 ? ranked[0] : null

  return (
    <div>
      <div className="flex justify-between text-white/60">
        <span>{meta.prompt || '질문을 입력하세요'}</span>
        <span>
          {total}/{players.length} 지목
        </span>
      </div>
      {top && (
        <div className="mt-3 text-center">
          <span className="text-white/50">최다 지목 </span>
          <span className="text-3xl font-black">{top.nickname}</span>
        </div>
      )}
      <div className="mt-4 space-y-2 max-w-2xl mx-auto">
        {ranked
          .filter((r) => r.votes > 0)
          .map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-28 truncate text-right font-bold">{r.nickname}</span>
              <div className="flex-1 h-7 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500 flex items-center justify-end pr-2 text-sm font-bold"
                  style={{ width: `${(r.votes / max) * 100}%` }}
                >
                  {r.votes}
                </div>
              </div>
            </div>
          ))}
        {!top && <p className="text-center text-white/40 py-6">아직 지목이 없습니다.</p>}
      </div>
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const myPick = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  const pick = (id) => open && dbSet(`${base}/pick/${me.id}`, id)

  return (
    <div>
      <p className="text-center text-white/60 mb-3">{meta.prompt || '지목할 사람을 고르세요'}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            disabled={!open}
            className={`rounded-xl px-3 py-3 font-bold border transition active:scale-95 ${
              myPick === p.id
                ? 'bg-indigo-500 border-indigo-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            } disabled:opacity-40`}
          >
            {p.nickname}
            {p.id === me.id && <span className="text-xs text-white/50"> (나)</span>}
          </button>
        ))}
      </div>
      {myPick && <p className="mt-3 text-center text-emerald-400 text-sm">지목 완료 · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'target',
  name: '팀원 지목',
  emoji: '🎯',
  tagline: '실시간 득표 게이지',
  promptLabel: '지목 질문 (예: 오늘 제일 취할 것 같은 사람?)',
  HostView,
  PlayerView,
}
