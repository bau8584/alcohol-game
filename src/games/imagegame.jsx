// 이미지 게임 🖼️ — 팀 히든 추측.
// 수비팀(맞히는 팀) 중 '주인공' 1명을 정하면, 그 주인공은 수비팀에겐 비밀·공격팀에겐 공개.
// 공격팀이 돌아가며 주인공의 '이미지'를 한마디씩(이름 금지, 오프라인) → 수비팀이 "우리 팀 누구?" 추측.
// 맞히면 수비팀 승 / 못 맞히면 공격팀 승. (앱은 비밀 배분 + 판정만)
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'

const pick1 = (arr) => arr[Math.floor(Math.random() * arr.length)]

function HostView({ base, meta, players, teams }) {
  const guardTeamId = useValue(`${base}/guardTeam`)
  const targetId = useValue(`${base}/target`)
  const guessRaw = useValue(`${base}/guess`)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const guardTeam = teams.find((t) => t.id === guardTeamId)
  const guardMembers = guardTeam?.members || []
  const guessers = guardMembers.filter((m) => m.id !== targetId)

  // 수비팀 추측 집계 (최다득표 = 팀의 답)
  const { teamGuess, guessCount, correct } = useMemo(() => {
    const votes = {}
    guessers.forEach((m) => { const g = guessRaw?.[m.id]; if (g) votes[g] = (votes[g] || 0) + 1 })
    let top = null, topN = 0
    Object.entries(votes).forEach(([id, n]) => { if (n > topN) { topN = n; top = id } })
    return { teamGuess: top, guessCount: Object.keys(votes).length, correct: top && top === targetId }
  }, [guessRaw, guessers, targetId])

  const pickGuard = (tid) => dbUpdate(base, { guardTeam: tid, target: null, guess: null })
  const setTarget = (pid) => dbSet(`${base}/target`, pid)
  const randomTarget = () => { if (guardMembers.length) setTarget(pick1(guardMembers).id) }

  if (staged) {
    return (
      <div className="text-center">
        <div className="text-5xl">🖼️</div>
        <p className="mt-1 font-display text-lg">이미지 게임</p>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          수비팀이 주인공을 맞히는 게임. 주인공은 <b>수비팀에겐 비밀</b>, 공격팀은 볼 수 있어요.
        </p>

        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>① 수비팀(맞히는 팀) 선택 · 나머지는 공격팀(설명)</div>
          <div className="flex flex-wrap justify-center gap-2">
            {teams.map((t) => (
              <button key={t.id} onClick={() => pickGuard(t.id)} className="clay-btn px-4 py-2 font-display" style={guardTeamId === t.id ? { background: t.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {t.name} ({t.members.length})
              </button>
            ))}
          </div>
        </div>

        {guardTeam && (
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>② 주인공 정하기 (수비팀 {guardTeam.name} 중)</div>
            <button onClick={randomTarget} className="clay-btn px-5 py-2 font-display mb-2" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 랜덤</button>
            <div className="flex flex-wrap justify-center gap-1.5">
              {guardMembers.map((m) => (
                <button key={m.id} onClick={() => setTarget(m.id)} className="clay-btn px-3 py-1.5 text-sm" style={targetId === m.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{m.nickname}</button>
              ))}
              {!guardMembers.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>팀원이 없어요.</span>}
            </div>
            {targetId && <p className="mt-2 text-sm" style={{ color: 'var(--c-sky)' }}>🤫 주인공: {byId[targetId]?.nickname} (공격팀에게만 공개됨) · ‘시작’ 누르세요</p>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>수비팀 <b style={{ color: guardTeam?.color }}>{guardTeam?.name}</b> · 공격팀이 설명 중</div>
      {reveal ? (
        <div className="mt-3">
          <div style={{ color: 'var(--ink-soft)' }}>주인공은</div>
          <div className="font-display text-4xl mt-1 animate-pop">🎯 {byId[targetId]?.nickname || '?'}</div>
          <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>수비팀 추측: <b style={{ color: 'var(--ink)' }}>{teamGuess ? byId[teamGuess]?.nickname : '없음'}</b></div>
          <div className="mt-3 clay inline-block px-6 py-3 font-display text-2xl animate-pop" style={{ background: correct ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
            {correct ? `✅ 수비팀(${guardTeam?.name}) 승리!` : '💥 공격팀 승리!'}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-display text-lg" style={{ color: 'var(--c-sky)' }}>🎯 주인공(진행자만): {byId[targetId]?.nickname || '?'}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>공격팀이 돌아가며 이미지 설명 → 수비팀 추측 중… ({guessCount}/{guessers.length})</p>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>👁 ‘공개’를 누르면 정답·승패 발표</p>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me, myTeam }) {
  const guardTeamId = useValue(`${base}/guardTeam`)
  const targetId = useValue(`${base}/target`)
  const myGuess = useValue(`${base}/guess/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  if (!guardTeamId || !targetId) {
    return <div className="text-center py-12"><div className="text-5xl">🖼️</div><p className="mt-3 font-display text-xl">진행자가 준비 중…</p></div>
  }

  const inGuard = myTeam?.id === guardTeamId
  const amTarget = me.id === targetId

  if (reveal) {
    const win = inGuard // 결과는 호스트 화면에서 상세; 여기선 팀 관점 간단 표시
    return (
      <div className="text-center py-8">
        <div className="text-5xl">🎯</div>
        <p className="mt-2 font-display text-2xl">주인공은 {byId[targetId]?.nickname}!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>승패는 메인 화면에서 확인하세요 🖥️</p>
      </div>
    )
  }

  // 공격팀 — 주인공 공개
  if (!inGuard) {
    return (
      <div className="text-center py-6">
        <div className="clay p-5" style={{ background: 'var(--c-coral)', color: '#fff' }}>
          <div className="opacity-90">🎯 이 사람의 이미지를 설명하세요</div>
          <div className="font-display text-4xl mt-1">{byId[targetId]?.nickname}</div>
          <div className="mt-2 text-sm opacity-90">돌아가며 한마디씩! <b>이름은 절대 금지</b> 🤐</div>
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>수비팀이 누구인지 맞히면 수비팀 승!</p>
      </div>
    )
  }

  // 수비팀 주인공 본인
  if (amTarget) {
    return (
      <div className="text-center py-8 clay" style={{ background: 'var(--c-sky)', color: '#fff' }}>
        <div className="text-5xl">🙊</div>
        <p className="mt-2 font-display text-2xl">너가 주인공!</p>
        <p className="mt-1 text-sm opacity-90">조용히, 표정 관리~ 팀원들이 널 맞혀야 해요.</p>
      </div>
    )
  }

  // 수비팀 추측자
  const candidates = (myTeam?.members || []).filter((m) => m.id !== me.id)
  return (
    <div className="text-center">
      <p className="font-display text-lg">우리 팀 중 누가 주인공?</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>상대팀 설명 듣고 골라요 🙈 (맞히면 우리 팀 승!)</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {candidates.map((m) => (
          <button
            key={m.id}
            onClick={() => open && dbSet(`${base}/guess/${me.id}`, m.id)}
            disabled={!open}
            className="clay-btn py-3 font-display"
            style={myGuess === m.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {m.nickname}
          </button>
        ))}
        {!candidates.length && <p className="col-span-2 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>팀원이 없어요.</p>}
      </div>
      {myGuess && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>골랐어요 · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'imagegame',
  name: '이미지 게임',
  emoji: '🖼️',
  tagline: '팀 히든 추측 · 주인공 이미지 맞히기',
  genres: ['party', 'mind'],
  traits: ['team'],
  HostView,
  PlayerView,
}
