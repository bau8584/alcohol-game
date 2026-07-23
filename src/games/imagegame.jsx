// 이미지 게임 🖼️ — 팀 히든 추측.
// 수비팀(맞히는 팀) 중 '주인공' 1명을, 공격팀이 다수결로 정한다(공격팀만 주인공을 봄 · 수비팀·진행자 화면엔 비밀).
// 공격팀이 돌아가며 주인공의 '이미지'를 한마디씩(이름 금지, 오프라인) → 수비팀이 다수결로 "우리 팀 누구?" 추측.
// 맞히면 수비팀 승 / 못 맞히면 공격팀 승. (앱: 팀 지정 + 주인공/추측 다수결 + 판정. 주인공은 공용화면에 절대 안 띄움)
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

// votesRaw + 투표자 id 목록 → 최다득표 { top, n(최다표), voted(투표수) }
function tally(votesRaw, voterIds) {
  const c = {}
  voterIds.forEach((id) => { const v = votesRaw?.[id]; if (v) c[v] = (c[v] || 0) + 1 })
  let top = null, n = 0
  Object.entries(c).forEach(([k, x]) => { if (x > n) { n = x; top = k } })
  return { top, n, voted: voterIds.filter((id) => votesRaw?.[id]).length }
}

function HostView({ base, meta, players, teams }) {
  const guardTeamId = useValue(`${base}/guardTeam`)
  const targetId = useValue(`${base}/target`)
  const atkRaw = useValue(`${base}/atkVote`)
  const guessRaw = useValue(`${base}/guess`)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const guardTeam = teams.find((t) => t.id === guardTeamId)
  const guardMembers = guardTeam?.members || []
  const attackerIds = players.filter((p) => p.teamId && p.teamId !== guardTeamId).map((p) => p.id)
  const guesserIds = guardMembers.filter((m) => m.id !== targetId).map((m) => m.id)

  const atk = useMemo(() => tally(atkRaw, attackerIds), [atkRaw, attackerIds])
  const def = useMemo(() => tally(guessRaw, guesserIds), [guessRaw, guesserIds])
  const correct = targetId && def.top === targetId

  const pickGuard = (tid) => dbUpdate(base, { guardTeam: tid, target: null, atkVote: null, guess: null })

  // ── 설정: 수비팀만 지정 (주인공은 공격팀이 폰에서 정함) ──
  if (staged) {
    return (
      <div className="text-center">
        <div className="text-5xl">🖼️</div>
        <p className="mt-1 font-display text-lg">이미지 게임</p>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          수비팀 중 <b>주인공</b> 1명을 <b>공격팀이 폰에서 다수결로</b> 정해요. 주인공은 수비팀·이 화면엔 <b>비밀</b>!
        </p>
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>수비팀(맞히는 팀) 선택 · 나머지는 공격팀(설명)</div>
          <div className="flex flex-wrap justify-center gap-2">
            {teams.map((t) => (
              <button key={t.id} onClick={() => pickGuard(t.id)} className="clay-btn px-4 py-2 font-display" style={guardTeamId === t.id ? { background: t.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {t.name} ({t.members.length})
              </button>
            ))}
          </div>
          {guardTeam && (
            <p className="mt-3 text-sm" style={{ color: 'var(--c-sky)' }}>
              🛡 수비팀: {guardTeam.name} · ⚔️ 공격팀: {attackerIds.length}명 · ‘시작’을 누르면 공격팀이 주인공을 정합니다
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── 진행/결과: 주인공은 절대 노출하지 않음(공개 전) ──
  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>🛡 수비팀 <b style={{ color: guardTeam?.color }}>{guardTeam?.name}</b> · ⚔️ 공격팀이 설명</div>
      {reveal ? (
        <div className="mt-3">
          <div style={{ color: 'var(--ink-soft)' }}>주인공은</div>
          <div className="font-display text-4xl mt-1 animate-pop">🎯 {byId[targetId]?.nickname || '?'}</div>
          <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>수비팀 추측: <b style={{ color: 'var(--ink)' }}>{def.top ? byId[def.top]?.nickname : '없음'}</b></div>
          <div className="mt-3 clay inline-block px-6 py-3 font-display text-2xl animate-pop" style={{ background: correct ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
            {correct ? `✅ 수비팀(${guardTeam?.name}) 승리!` : '💥 공격팀 승리!'}
          </div>
        </div>
      ) : !targetId ? (
        <div className="mt-4">
          <div className="text-4xl">🤫</div>
          <p className="mt-2 font-display text-lg">공격팀이 주인공을 정하는 중…</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>공격팀 폰에서 다수결 투표 ({atk.voted}/{attackerIds.length})</p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="text-4xl">🖼️</div>
          <p className="mt-2 font-display text-lg">공격팀이 이미지로 설명 중 · 수비팀 추측 {def.voted}/{guesserIds.length}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>주인공이 누구인지는 비밀 🤐 · 👁 ‘공개’로 정답·승패 발표</p>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me, myTeam }) {
  const guardTeamId = useValue(`${base}/guardTeam`)
  const targetId = useValue(`${base}/target`)
  const atkRaw = useValue(`${base}/atkVote`)
  const myAtk = useValue(`${base}/atkVote/${me.id}`)
  const myGuess = useValue(`${base}/guess/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  const guardTeam = useMemo(() => (guardTeamId ? { members: (players.filter((p) => p.teamId === guardTeamId)) } : null), [players, guardTeamId])
  const guardMembers = guardTeam?.members || []
  const attackerIds = players.filter((p) => p.teamId && p.teamId !== guardTeamId).map((p) => p.id)
  const atk = useMemo(() => tally(atkRaw, attackerIds), [atkRaw, attackerIds])

  if (!guardTeamId) {
    return <div className="text-center py-12"><div className="text-5xl">🖼️</div><p className="mt-3 font-display text-xl">진행자가 준비 중…</p></div>
  }

  const inGuard = myTeam?.id === guardTeamId
  const amTarget = targetId && me.id === targetId

  if (reveal) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl">🎯</div>
        <p className="mt-2 font-display text-2xl">주인공은 {byId[targetId]?.nickname}!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>승패는 메인 화면에서 확인하세요 🖥️</p>
      </div>
    )
  }

  /* ═══ 공격팀 ═══ */
  if (!inGuard) {
    // 주인공 확정 전 → 다수결로 주인공 정하기
    if (!targetId) {
      const confirm = () => { if (atk.top) dbSet(`${base}/target`, atk.top) }
      return (
        <div className="text-center">
          <p className="font-display text-lg">⚔️ 주인공으로 지목할 <b>수비팀원</b>을 골라요</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>공격팀 다수결로 결정 · 정해지면 그 사람을 이미지로 설명!</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {guardMembers.map((m) => (
              <button key={m.id} onClick={() => open && dbSet(`${base}/atkVote/${me.id}`, m.id)} disabled={!open}
                className="clay-btn py-3 font-display" style={myAtk === m.id ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {m.nickname}
              </button>
            ))}
            {!guardMembers.length && <p className="col-span-2 py-4 text-sm" style={{ color: 'var(--ink-soft)' }}>수비팀원이 없어요.</p>}
          </div>
          <div className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            현재 다수결: <b style={{ color: 'var(--ink)' }}>{atk.top ? byId[atk.top]?.nickname : '—'}</b> ({atk.voted}/{attackerIds.length} 투표)
          </div>
          <Button className="mt-2 w-full" onClick={confirm} disabled={!open || !atk.top}>✅ {atk.top ? `${byId[atk.top]?.nickname}(으)로 확정` : '확정'}</Button>
        </div>
      )
    }
    // 확정 후 → 주인공 공개 + 설명
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

  /* ═══ 수비팀 ═══ */
  // 주인공 확정 전 → 대기
  if (!targetId) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🙈</div>
        <p className="mt-3 font-display text-xl">공격팀이 주인공 정하는 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>잠시만요! 곧 설명이 시작돼요.</p>
      </div>
    )
  }
  // 주인공 본인
  if (amTarget) {
    return (
      <div className="text-center py-8 clay" style={{ background: 'var(--c-sky)', color: '#fff' }}>
        <div className="text-5xl">🙊</div>
        <p className="mt-2 font-display text-2xl">너가 주인공!</p>
        <p className="mt-1 text-sm opacity-90">조용히, 표정 관리~ 팀원들이 널 맞혀야 해요.</p>
      </div>
    )
  }
  // 수비팀 추측자 — 다수결 투표
  const candidates = guardMembers.filter((m) => m.id !== me.id)
  return (
    <div className="text-center">
      <p className="font-display text-lg">우리 팀 중 누가 주인공?</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>상대팀 설명 듣고 골라요 🙈 · 팀 다수결로 결정 (맞히면 승!)</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {candidates.map((m) => (
          <button key={m.id} onClick={() => open && dbSet(`${base}/guess/${me.id}`, m.id)} disabled={!open}
            className="clay-btn py-3 font-display" style={myGuess === m.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
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
  tagline: '팀 히든 추측 · 공격팀이 주인공 지목 · 수비팀 추측',
  genres: ['party', 'mind'],
  traits: ['team'],
  HostView,
  PlayerView,
}
