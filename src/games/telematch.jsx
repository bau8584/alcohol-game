// 팀 텔레파시 — 주제 하나에 팀원들이 각자 한 단어. 팀원끼리 겹칠수록 팀 점수(같은 답 g명 → g-1점).
// 줄줄이(겹치면 0점)의 정반대: 남과 다르게가 아니라, 우리 팀과 '똑같이' 떠올려야 이긴다.
// 판정 자동. open→reveal 프레임워크 + 팀 점수 반영 버튼.
import { useMemo } from 'react'
import { useValue, dbSet, dbTransaction, toList } from '../lib/db'
import { addTeamScore } from '../lib/actions'
import { Button } from '../components/ui'

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')
const PRESETS = [
  '치킨 하면 떠오르는 브랜드', '여름 하면 떠오르는 것', '술자리 필수 안주',
  '겨울 하면 떠오르는 것', '제주도 하면 떠오르는 것', 'MT 하면 떠오르는 것',
  '빨간색 하면 떠오르는 것', '아침에 먹는 것', '노래방 애창곡',
  '스트레스 풀리는 것', '첫 데이트 장소', '비 오는 날 생각나는 음식',
]

// ans:{pid:{t}} + teams → [{team, groups:[{text,pids}], score, answered}]
function resolve(ansRaw, players, teams) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const answers = toList(ansRaw)
    .map((a) => ({ pid: a.id, text: a.t, n: norm(a.t), p: byId[a.id] }))
    .filter((a) => a.n && a.p)
  return teams.map((team) => {
    const mine = answers.filter((a) => a.p.teamId === team.id)
    const byNorm = {}
    mine.forEach((a) => { (byNorm[a.n] = byNorm[a.n] || { text: a.text, pids: [] }).pids.push(a.pid) })
    const groups = Object.values(byNorm).sort((a, b) => b.pids.length - a.pids.length)
    const score = groups.reduce((s, g) => s + Math.max(0, g.pids.length - 1), 0)
    return { team, groups, score, answered: mine.length }
  })
}

function HostView({ roomId, base, meta, players, teams }) {
  const ansRaw = useValue(`${base}/ans`)
  const scored = useValue(`${base}/scored`)
  const reveal = meta.roundStatus === 'reveal'
  const nameOf = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
  const rows = useMemo(() => resolve(ansRaw, players, teams), [ansRaw, players, teams])
  const answered = Object.keys(ansRaw || {}).length
  const live = players.filter((p) => p.connected !== false).length

  const applyScore = async () => {
    const r = await dbTransaction(`${base}/scored`, (cur) => (cur ? undefined : true))
    if (!r.committed) return
    rows.forEach((row) => row.score > 0 && addTeamScore(roomId, row.team.id, row.score))
  }

  return (
    <div className="text-center">
      <div className="font-display text-xl">📡 팀원과 같은 답을 떠올려요!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>같은 답을 쓴 팀원이 많을수록 팀 점수 ↑ (g명 → g-1점)</div>

      {!reveal && (
        <div className="mt-4" style={{ color: 'var(--ink-soft)' }}>
          답한 사람 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{answered}</span> / {live}
          <div className="text-sm mt-1">내용은 공개 전까지 비밀 🤫</div>
        </div>
      )}

      {reveal && (
        <div className="mt-4 space-y-3 max-w-lg mx-auto text-left">
          {[...rows].sort((a, b) => b.score - a.score).map((row) => (
            <div key={row.team.id} className="clay-inset p-3">
              <div className="flex items-center justify-between font-bold" style={{ color: row.team.color }}>
                <span>{row.team.name}</span>
                <span className="font-display text-xl">+{row.score}점</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {row.groups.map((g, i) => {
                  const matched = g.pids.length > 1
                  return (
                    <span key={i} className="px-2 py-1 rounded-lg text-sm" style={matched ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                      {matched && '💞 '}<b>{g.text}</b> <span className="opacity-90">{g.pids.map((p) => nameOf(p)).join(', ')}</span>
                    </span>
                  )
                })}
                {!row.groups.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>답한 팀원이 없어요.</span>}
              </div>
            </div>
          ))}
          <Button className="w-full" onClick={applyScore} disabled={!!scored}>{scored ? '✅ 팀 점수에 반영됨' : '🏆 팀 점수에 반영'}</Button>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me, myTeam }) {
  const mine = useValue(`${base}/ans/${me.id}`)
  const ansRaw = useValue(`${base}/ans`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const topic = meta.prompt

  const myRow = useMemo(() => {
    if (!reveal || !myTeam) return null
    return resolve(ansRaw, players, [myTeam])[0]
  }, [reveal, ansRaw, players, myTeam])
  const myGroup = myRow?.groups.find((g) => g.pids.includes(me.id))
  const matchedMates = myGroup && myGroup.pids.length > 1
    ? myGroup.pids.filter((p) => p !== me.id).map((p) => players.find((x) => x.id === p)?.nickname || '?')
    : []

  const submit = (v) => { if (open) dbSet(`${base}/ans/${me.id}`, { t: v }) }

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제 · 우리 팀과 같은 답을!</div>
      <div className="font-display text-2xl leading-tight">{topic || '진행자가 주제를 정하는 중…'}</div>

      {reveal ? (
        <div className="mt-4">
          <div style={{ color: 'var(--ink-soft)' }}>내 답</div>
          <div className="font-display text-3xl">{mine?.t || '—'}</div>
          {matchedMates.length ? (
            <p className="mt-3 font-display text-xl animate-pop" style={{ color: 'var(--c-mint)' }}>💞 {matchedMates.join(', ')} 와(과) 일치!</p>
          ) : mine?.t ? (
            <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>아무와도 안 겹쳤어요 🥲</p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>이번 판은 답을 안 냈어요</p>
          )}
        </div>
      ) : (
        <>
          <input
            defaultValue={mine?.t || ''}
            onChange={(e) => submit(e.target.value)}
            disabled={!open}
            className="mt-4 w-full clay-inset px-4 py-4 text-xl text-center disabled:opacity-50"
            placeholder={open ? '한 단어로!' : '진행자 대기 중'}
          />
          {mine?.t ? (
            <p className="mt-3 font-display" style={{ color: 'var(--c-grape)' }}>제출: {mine.t} · 공개 전까지 수정 가능</p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>팀원이 뭘 쓸지 예상해서 똑같이! 💞</p>
          )}
        </>
      )}
    </div>
  )
}

export default {
  id: 'telematch',
  name: '팀 텔레파시',
  emoji: '📡',
  tagline: '팀원끼리 같은 답 → 겹칠수록 점수',
  genres: ['telepathy'],
  traits: ['team'],
  promptLabel: '주제 (직접 입력 또는 🎲)',
  presets: PRESETS,
  HostView,
  PlayerView,
}
