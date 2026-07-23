// 순위 싱크 — 주제의 5개 항목을 팀원이 각자 몰래 순위 매김(탭 순서). 공개하면 팀 안에서
// 같은 항목을 같은 순위에 놓은 사람이 많을수록 팀 점수(같은 순위 g명 → g-1점). 팀 이심전심(순서 버전).
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbTransaction } from '../lib/db'
import { addTeamScore } from '../lib/actions'
import { Button } from '../components/ui'

const TOPICS = [
  { t: '먹고 싶은 야식', items: ['치킨', '피자', '족발', '라면', '떡볶이'] },
  { t: '가고 싶은 여행지', items: ['제주', '부산', '유럽', '일본', '동남아'] },
  { t: '최고의 계절', items: ['봄', '여름', '가을', '겨울', '환절기'] },
  { t: '무인도에 가져갈 것', items: ['라이터', '칼', '물', '휴대폰', '이불'] },
  { t: '이상형 조건', items: ['외모', '성격', '재력', '유머', '능력'] },
  { t: '스트레스 해소법', items: ['먹기', '자기', '운동', '쇼핑', '수다'] },
  { t: '술자리 최고 안주', items: ['삼겹살', '치킨', '회', '곱창', '과일'] },
  { t: '주말에 하고 싶은 것', items: ['넷플릭스', '늦잠', '나들이', '게임', '약속'] },
]

// ranks:{pid:[itemIdx…순서]} → 팀별 점수 (항목별 같은 순위 그룹 g-1 합)
function scoreTeam(ranks, memberIds, itemCount) {
  const arrs = memberIds.map((pid) => ranks?.[pid]).filter((a) => Array.isArray(a) && a.length)
  let score = 0
  const detail = [] // [{item, best}] 최다 일치 순위 그룹 크기
  for (let item = 0; item < itemCount; item++) {
    const rankCount = {}
    arrs.forEach((a) => { const r = a.indexOf(item); if (r >= 0) rankCount[r] = (rankCount[r] || 0) + 1 })
    const groups = Object.values(rankCount)
    const best = groups.length ? Math.max(...groups) : 0
    score += groups.reduce((s, g) => s + Math.max(0, g - 1), 0)
    detail.push(best)
  }
  return { score, answered: arrs.length }
}

function HostView({ roomId, base, meta, players, teams }) {
  const topicIdx = useValue(`${base}/topicIdx`)
  const ranks = useValue(`${base}/ranks`)
  const scored = useValue(`${base}/scored`)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'
  const topic = topicIdx != null ? TOPICS[topicIdx] : null
  const answered = Object.keys(ranks || {}).length
  const live = players.filter((p) => p.connected !== false).length

  const rows = useMemo(() => {
    if (!topic) return []
    return teams.map((team) => {
      const memberIds = players.filter((p) => p.teamId === team.id).map((p) => p.id)
      return { team, ...scoreTeam(ranks, memberIds, topic.items.length) }
    })
  }, [teams, players, ranks, topic])

  const applyScore = async () => {
    const r = await dbTransaction(`${base}/scored`, (cur) => (cur ? undefined : true))
    if (!r.committed) return
    rows.forEach((row) => row.score > 0 && addTeamScore(roomId, row.team.id, row.score))
  }

  return (
    <div className="text-center">
      <div className="font-display text-xl">📊 팀원과 순위를 맞춰요!</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>같은 항목을 같은 순위에 둔 팀원이 많을수록 점수</div>

      {staged && (
        <div className="mt-4">
          <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>주제 선택</div>
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {TOPICS.map((tp, i) => (
              <button key={i} onClick={() => dbSet(`${base}/topicIdx`, i)} className="clay-btn px-3 py-2 text-sm font-bold"
                style={topicIdx === i ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {tp.t}
              </button>
            ))}
          </div>
          {topic && <div className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>항목: {topic.items.join(' · ')}</div>}
        </div>
      )}

      {!staged && topic && (
        <div className="mt-3 clay-inset py-2">
          <div className="font-display text-2xl">{topic.t}</div>
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{topic.items.join(' · ')}</div>
        </div>
      )}

      {!staged && !reveal && (
        <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>
          순위 매긴 사람 <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{answered}</span> / {live}
        </div>
      )}

      {reveal && (
        <div className="mt-4 space-y-2 max-w-lg mx-auto">
          {[...rows].sort((a, b) => b.score - a.score).map((row) => (
            <div key={row.team.id} className="clay-inset px-4 py-3 flex items-center justify-between">
              <span className="font-bold" style={{ color: row.team.color }}>{row.team.name} <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({row.answered}명)</span></span>
              <span className="font-display text-2xl">+{row.score}점</span>
            </div>
          ))}
          <Button className="w-full" onClick={applyScore} disabled={!!scored}>{scored ? '✅ 팀 점수에 반영됨' : '🏆 팀 점수에 반영'}</Button>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me, myTeam }) {
  const topicIdx = useValue(`${base}/topicIdx`)
  const mine = useValue(`${base}/ranks/${me.id}`)
  const ranks = useValue(`${base}/ranks`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const topic = topicIdx != null ? TOPICS[topicIdx] : null
  const [seq, setSeq] = useState(mine || [])

  // 공개: 내 순위 + 팀 내 각 항목 일치 인원 (훅은 조기 반환보다 위에서 무조건 호출 — 훅 순서 고정)
  const teamAgree = useMemo(() => {
    if (!reveal || !myTeam || !topic) return null
    const memberIds = players.filter((p) => p.teamId === myTeam.id).map((p) => p.id)
    return topic.items.map((_, item) => {
      const myRank = (mine || []).indexOf(item)
      if (myRank < 0) return 0
      return memberIds.filter((pid) => Array.isArray(ranks?.[pid]) && ranks[pid].indexOf(item) === myRank).length
    })
  }, [reveal, myTeam, players, ranks, mine, topic])

  if (!topic) {
    return <div className="text-center py-10"><div className="text-5xl">📊</div><p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 주제를 고르는 중…</p></div>
  }

  const rankOf = (i) => { const idx = seq.indexOf(i); return idx >= 0 ? idx + 1 : null }
  const toggle = (i) => {
    if (!open) return
    let next
    if (seq.includes(i)) next = seq.filter((x) => x !== i)
    else if (seq.length < topic.items.length) next = [...seq, i]
    else return
    setSeq(next)
    dbSet(`${base}/ranks/${me.id}`, next)
  }

  return (
    <div className="text-center">
      <div className="font-display text-2xl">{topic.t}</div>
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{reveal ? '내 순위 · 팀원과 일치 표시' : open ? '탭한 순서대로 1위 → 5위' : '진행자 대기 중'}</div>

      <div className="mt-4 space-y-2 max-w-sm mx-auto">
        {topic.items.map((it, i) => {
          const r = reveal ? ((mine || []).indexOf(i) >= 0 ? (mine || []).indexOf(i) + 1 : null) : rankOf(i)
          const agree = teamAgree?.[i] || 0
          return (
            <button key={i} onClick={() => toggle(i)} disabled={!open}
              className="clay-btn w-full px-4 py-3 flex items-center justify-between disabled:opacity-90"
              style={r ? { background: myTeam?.color || 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <span className="font-display text-lg">{it}</span>
              <span className="flex items-center gap-2">
                {reveal && agree > 1 && <span className="text-sm">💞{agree}</span>}
                <span className="font-display text-xl w-8 h-8 rounded-full flex items-center justify-center" style={{ background: r ? 'rgba(255,255,255,0.25)' : 'var(--surface)' }}>{r || '·'}</span>
              </span>
            </button>
          )
        })}
      </div>
      {!reveal && open && (
        <button onClick={() => { setSeq([]); dbSet(`${base}/ranks/${me.id}`, []) }} className="mt-3 text-sm underline" style={{ color: 'var(--ink-soft)' }}>다시 매기기</button>
      )}
    </div>
  )
}

export default {
  id: 'ranksync',
  name: '순위 싱크',
  emoji: '📊',
  tagline: '팀원과 순위 맞추기 · 겹칠수록 점수',
  genres: ['telepathy'],
  traits: ['team'],
  HostView,
  PlayerView,
}
