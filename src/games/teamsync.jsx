// ⑦ 우리 팀 예측 싱크 — 각자 '우리 팀에서 ○○할 사람'을 비밀 지목. 공개 시 팀별 최다지목 인물 + 일치율%.
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'

// 팀 멤버들의 지목을 모아 { topName, topCount, answered, sync% } 계산
function teamStat(team, pickMap, nameOf) {
  const answers = team.members.map((m) => pickMap[m.id]).filter(Boolean)
  const counts = {}
  answers.forEach((tid) => (counts[tid] = (counts[tid] || 0) + 1))
  let topId = null
  let topCount = 0
  Object.entries(counts).forEach(([tid, c]) => {
    if (c > topCount) {
      topCount = c
      topId = tid
    }
  })
  const sync = answers.length ? Math.round((topCount / answers.length) * 100) : 0
  return { topName: topId ? nameOf(topId) : null, topCount, answered: answers.length, sync }
}

function HostView({ base, meta, players, teams }) {
  const raw = useValue(`${base}/pick`)
  const reveal = meta.roundStatus === 'reveal'
  const nameOf = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (id) => byId[id] || id
  }, [players])
  const stats = useMemo(() => {
    const pickMap = Object.fromEntries(toList(raw).map((r) => [r.id, r.value]))
    return teams.map((t) => ({ ...t, ...teamStat(t, pickMap, nameOf) }))
  }, [raw, teams, nameOf])

  return (
    <div className="text-center">
      <div className="font-display text-2xl">{meta.prompt || '우리 팀에서 ○○할 사람?'}</div>
      <div className="mt-4 grid gap-3 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        {stats.map((s) => (
          <div key={s.id} className="clay p-3" style={{ background: 'var(--surface)' }}>
            <div className="font-display truncate" style={{ color: s.color }}>{s.name}</div>
            {reveal ? (
              <>
                <div className="font-display text-4xl mt-1">{s.sync}%</div>
                {s.topName ? (
                  <div className="text-sm mt-1">👉 <b>{s.topName}</b> <span style={{ color: 'var(--ink-soft)' }}>({s.topCount}표)</span></div>
                ) : (
                  <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>무응답</div>
                )}
              </>
            ) : (
              <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{s.answered}/{s.members.length}</div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>{reveal ? '가장 잘 맞은 팀이 텔레파시 승! 🏆' : '팀원끼리 마음이 통할까? 응답 수집 중…'}</p>
    </div>
  )
}

function PlayerView({ base, meta, me, myTeam }) {
  const mine = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  const members = myTeam?.members || []
  return (
    <div className="text-center">
      <p className="mb-1" style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '우리 팀에서 지목'}</p>
      <p className="mb-3 text-sm" style={{ color: myTeam?.color }}>{myTeam?.name} 팀원 중 1명</p>
      <div className="grid grid-cols-2 gap-2">
        {members.map((p) => (
          <button
            key={p.id}
            onClick={() => open && dbSet(`${base}/pick/${me.id}`, p.id)}
            disabled={!open}
            className="clay-btn py-3 font-display text-lg"
            style={mine === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}{p.id === me.id && ' (나)'}
          </button>
        ))}
        {!members.length && <p className="col-span-2 py-6" style={{ color: 'var(--ink-soft)' }}>팀원이 없어요.</p>}
      </div>
      {mine && <p className="mt-3 text-center text-sm" style={{ color: 'var(--c-mint)' }}>지목 완료 · 변경 가능 (비밀)</p>}
    </div>
  )
}

export default {
  id: 'teamsync',
  name: '팀 예측 싱크',
  emoji: '📊',
  tagline: '팀원과 텔레파시 · 일치율%',
  genres: ['telepathy'],
  traits: ['team'],
  promptLabel: '질문 (예: 우리 팀에서 제일 먼저 취할 사람?)',
  presets: [
    '우리 팀에서 제일 먼저 취할 사람?',
    '우리 팀 분위기 메이커는?',
    '우리 팀에서 제일 인기 많을 것 같은 사람?',
    '우리 팀에서 갑자기 사라질 것 같은 사람?',
    '우리 팀 리더로 어울리는 사람?',
    '우리 팀에서 제일 잘 챙겨주는 사람?',
    '우리 팀에서 오늘 사고 칠 것 같은 사람?',
    '우리 팀에서 제일 늦잠 잘 사람?',
  ],
  HostView,
  PlayerView,
}
