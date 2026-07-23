// 한밤의 늑대인간 (One Night Ultimate Werewolf) — 비밀 역할 + 앱이 안내하는 밤 행동 + 토론 + 투표.
// 탈락 없음(단판): 밤에 역할이 뒤섞이고, 낮에 토론 후 한 명을 지목. 늑대를 잡으면 마을 승, 못 잡으면 늑대 승.
// 카드 이동 규칙(도둑·트러블메이커)은 '원본 배분 + 행동 기록'으로 최종 역할을 결정론적으로 계산한다.
// controls:'self' — 배분/밤 진행/투표/결과를 게임이 직접 관리.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbRemove, toList } from '../lib/db'
import { Button } from '../components/ui'

const ROLES = {
  werewolf: {
    name: '늑대인간', emoji: '🐺', team: 'wolf', teamName: '늑대팀',
    desc: '밤에 눈을 떠서 다른 늑대가 누구인지 서로 확인해요.',
    goal: '정체를 숨기고 낮 투표에서 안 걸리기.',
  },
  seer: {
    name: '예언자', emoji: '🔮', team: 'village', teamName: '마을팀',
    desc: '밤에 한 명의 카드, 또는 가운데 카드 2장을 몰래 봐요.',
    goal: '알아낸 정보로 늑대를 찾아 지목.',
  },
  robber: {
    name: '도둑', emoji: '🥷', team: 'village', teamName: '마을팀',
    desc: '밤에 한 명의 카드를 훔쳐 내 것과 바꾸고, 바뀐 내 역할을 확인해요. (상대는 바뀐 걸 모름)',
    goal: '바꾼 뒤엔 새 역할의 편! 늑대를 훔치면 내가 늑대가 돼요.',
  },
  troublemaker: {
    name: '트러블메이커', emoji: '🃏', team: 'village', teamName: '마을팀',
    desc: '밤에 나 말고 다른 두 사람의 카드를 서로 몰래 바꿔요. (내용은 안 봄, 당사자도 모름)',
    goal: '혼란을 일으켜 늑대를 흔들기.',
  },
  villager: {
    name: '마을 주민', emoji: '🧑‍🌾', team: 'village', teamName: '마을팀',
    desc: '특수 능력 없음 · 밤엔 아무것도 안 해요.',
    goal: '토론으로 늑대를 찾기.',
  },
}
const teamLabel = (r) => (ROLES[r]?.team === 'wolf' ? '🐺 늑대팀' : '🏡 마을팀')
const roleName = (r) => (r ? `${ROLES[r].emoji} ${ROLES[r].name}` : '—')
const NIGHT_ORDER = ['werewolf', 'seer', 'robber', 'troublemaker']

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 인원 N → 카드 N+3장 구성 (늑대2·예언자·도둑·트러블메이커 + 나머지 주민)
function buildDeck(n) {
  const cards = n >= 4 ? ['werewolf', 'werewolf'] : ['werewolf']
  cards.push('seer', 'robber', 'troublemaker')
  while (cards.length < n + 3) cards.push('villager')
  return cards.slice(0, n + 3)
}

// 원본 배분 + 도둑/트메 행동 → 최종 역할 맵
function computeFinal(rolesRaw, robberActor, robberTarget, tm) {
  const final = { ...(rolesRaw || {}) }
  if (robberActor && robberTarget && final[robberActor] != null && final[robberTarget] != null) {
    ;[final[robberActor], final[robberTarget]] = [final[robberTarget], final[robberActor]]
  }
  if (tm?.a && tm?.b && final[tm.a] != null && final[tm.b] != null) {
    ;[final[tm.a], final[tm.b]] = [final[tm.b], final[tm.a]]
  }
  return final
}

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

// 이 판에서 실제로 행동하는 밤 단계 (플레이어가 그 원본 역할을 가진 경우만)
function activeSteps(rolesRaw) {
  const held = new Set(Object.values(rolesRaw || {}))
  return NIGHT_ORDER.filter((r) => held.has(r))
}
const robberOf = (rolesRaw) => Object.entries(rolesRaw || {}).find(([, r]) => r === 'robber')?.[0] || null

// 처음 하는 사람을 위한 진행 흐름·승리조건 안내 (설정 화면)
function FlowGuide() {
  const [open, setOpen] = useState(true)
  return (
    <div className="clay-inset mt-3 max-w-lg mx-auto text-left">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2">
        <span className="font-display text-sm">🔰 처음이면 읽어요 · 이렇게 진행해요</span>
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
          <ol className="space-y-1 list-decimal list-inside">
            <li><b>밤</b> — 진행자가 역할을 하나씩 부르면, <b>그 역할인 사람만</b> 자기 폰에서 몰래 행동해요. (누가 그 역할인지는 비밀)</li>
            <li><b>낮</b> — 다 같이 토론하며 늑대를 추리해요.</li>
            <li><b>투표</b> — 각자 늑대 의심자 한 명을 지목.</li>
            <li><b>결과</b> — <b style={{ color: 'var(--ink)' }}>늑대를 한 명이라도 처형하면 마을팀 승</b>, 못 잡으면 늑대팀 승.</li>
          </ol>
          <p className="mt-2">😈 핵심: <b style={{ color: 'var(--ink)' }}>도둑·트러블메이커 때문에 밤새 역할이 바뀔 수 있어요.</b> 그래서 낮엔 내 역할이 처음과 다를 수도 있어요. 승패는 <b style={{ color: 'var(--ink)' }}>마지막(밤이 끝난 뒤) 역할</b> 기준!</p>
          <p className="mt-1 text-xs">탈락 없는 단판 · 늑대 카드 2장이 다 가운데에 있으면(=플레이어 중 늑대 0명) 아무도 처형 안 하면 마을 승.</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, players }) {
  const phase = useValue(`${base}/phase`) || 'setup'
  const rolesRaw = useValue(`${base}/roles`)
  const center = useValue(`${base}/center`)
  const nightStep = useValue(`${base}/nightStep`) || 0
  const robberTarget = useValue(`${base}/robber`)
  const tm = useValue(`${base}/tm`)
  const votesRaw = useValue(`${base}/votes`)
  const nameOf = useNameOf(players)
  const n = players.length

  const steps = useMemo(() => activeSteps(rolesRaw), [rolesRaw])

  const deal = () => {
    const deck = shuffle(buildDeck(n))
    const roles = {}
    players.forEach((p, i) => { roles[p.id] = deck[i] })
    const centerCards = deck.slice(n)
    dbSet(base, { phase: 'night', nightStep: 0, roles, center: centerCards, robber: null, tm: null, votes: null, seer: null })
  }
  const nextNight = () => {
    if (nightStep + 1 >= steps.length) dbUpdate(base, { phase: 'day' })
    else dbSet(`${base}/nightStep`, nightStep + 1)
  }
  const startVote = () => dbUpdate(base, { phase: 'vote' })
  const showResult = () => dbUpdate(base, { phase: 'result' })
  const reset = () => dbSet(base, { phase: 'setup' })

  // ── 설정 ──
  if (phase === 'setup') {
    const deck = buildDeck(n)
    const counts = deck.reduce((m, r) => ((m[r] = (m[r] || 0) + 1), m), {})
    return (
      <div className="text-center">
        <div className="text-5xl">🐺</div>
        <p className="font-display text-2xl mt-2">한밤의 늑대인간</p>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{n}명 · 카드 {n + 3}장(가운데 3장 포함)</p>

        <FlowGuide />

        <div className="mt-4 text-left max-w-lg mx-auto">
          <div className="font-display text-sm mb-2 text-center">이번 판 역할 ({n + 3}장)</div>
          <div className="space-y-1.5">
            {Object.entries(counts).map(([r, c]) => (
              <div key={r} className="clay-inset px-3 py-2 flex items-start gap-2">
                <span className="text-2xl shrink-0">{ROLES[r].emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm">
                    {ROLES[r].name} <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>×{c} · {teamLabel(r)}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{ROLES[r].desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {n < 3 ? (
          <p className="mt-4 font-bold" style={{ color: 'var(--c-coral)' }}>최소 3명이 필요해요.</p>
        ) : (
          <Button className="mt-5" onClick={deal}>🎲 역할 배분 · 밤 시작</Button>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>역할은 각자 폰에만 · 이 화면엔 안 떠요</p>
      </div>
    )
  }

  // ── 밤 ──
  if (phase === 'night') {
    const cur = steps[nightStep]
    return (
      <div className="text-center py-4">
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>🌙 밤 · {nightStep + 1}/{steps.length}단계</div>
        <div className="text-6xl mt-2">{ROLES[cur].emoji}</div>
        <p className="font-display text-3xl mt-2">{ROLES[cur].name}의 시간</p>
        <div className="clay-inset px-4 py-2.5 mt-3 max-w-md mx-auto text-sm">
          <div style={{ color: 'var(--ink)' }}>{ROLES[cur].desc}</div>
        </div>
        <p className="mt-3 font-bold" style={{ color: 'var(--ink)' }}>👉 "{ROLES[cur].name}, 눈 뜨세요"</p>
        <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>그 역할만 폰에서 행동하고, 끝나면 다시 눈 감기.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>(누가 그 역할인지는 비밀!)</p>
        <Button className="mt-4" onClick={nextNight}>{nightStep + 1 >= steps.length ? '☀️ 아침 · 토론으로' : '다음 단계 ▶'}</Button>
      </div>
    )
  }

  // ── 낮(토론) ──
  if (phase === 'day') {
    return (
      <div className="text-center py-6">
        <div className="text-6xl">☀️</div>
        <p className="font-display text-2xl mt-2">토론 시간!</p>
        <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>서로 질문하고 늑대를 찾아보세요.<br />밤새 역할이 바뀌었을 수도 있어요 😈</p>
        <Button className="mt-5" onClick={startVote}>🗳️ 투표 시작</Button>
      </div>
    )
  }

  // ── 투표 ──
  if (phase === 'vote') {
    const votes = toList(votesRaw)
    const voted = votes.length
    return (
      <div className="text-center py-4">
        <div className="text-5xl">🗳️</div>
        <p className="font-display text-2xl mt-2">투표 중… {voted}/{n}</p>
        <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>각자 폰에서 늑대로 의심되는 한 명 지목</p>
        <Button className="mt-4" onClick={showResult} disabled={voted === 0}>🔓 결과 공개</Button>
      </div>
    )
  }

  // ── 결과 ──
  const robberActor = robberOf(rolesRaw)
  const final = computeFinal(rolesRaw, robberActor, robberTarget, tm)
  const votes = toList(votesRaw).map((v) => ({ voter: v.id, target: v.value }))
  const tally = {}
  votes.forEach((v) => { if (v.target) tally[v.target] = (tally[v.target] || 0) + 1 })
  const maxV = Math.max(0, ...Object.values(tally))
  const executed = Object.entries(tally).filter(([, c]) => c === maxV && maxV > 0).map(([pid]) => pid)
  const wolvesAmongPlayers = players.filter((p) => ROLES[final[p.id]]?.team === 'wolf').map((p) => p.id)
  const executedWolf = executed.some((pid) => ROLES[final[pid]]?.team === 'wolf')
  const villageWins = executedWolf || wolvesAmongPlayers.length === 0

  return (
    <div className="text-center">
      <div className="text-5xl">{villageWins ? '🏡' : '🐺'}</div>
      <p className="font-display text-3xl mt-2" style={{ color: villageWins ? 'var(--c-mint)' : 'var(--c-coral)' }}>
        {villageWins ? '마을팀 승리!' : '늑대팀 승리!'}
      </p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
        처형: {executed.length ? executed.map(nameOf).join(', ') : '없음'} {executedWolf ? '· 늑대 적중 🎯' : wolvesAmongPlayers.length === 0 ? '· 늑대가 가운데 카드에' : '· 늑대 못 잡음'}
      </p>

      <div className="mt-4 max-w-lg mx-auto space-y-1.5 text-left">
        {players.map((p) => {
          const orig = rolesRaw?.[p.id]
          const fin = final[p.id]
          const changed = orig !== fin
          const isWolf = ROLES[fin]?.team === 'wolf'
          return (
            <div key={p.id} className="clay-inset flex items-center gap-2 px-3 py-2" style={isWolf ? { outline: '2px solid var(--c-coral)' } : {}}>
              <span className="font-bold flex-1 truncate">{p.nickname}</span>
              {tally[p.id] ? <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>🗳{tally[p.id]}</span> : null}
              <span className="text-sm">{roleName(fin)}</span>
              {changed && <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>(밤엔 {roleName(orig)})</span>}
            </div>
          )
        })}
        <div className="clay-inset px-3 py-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          가운데 카드: {(center || []).map((r) => roleName(r)).join(' · ')}
        </div>
      </div>
      <Button variant="ghost" className="mt-4" onClick={reset}>🔄 새 게임</Button>
    </div>
  )
}

/* ═══════════════ 플레이어 ═══════════════ */
function PlayerView({ base, players, me }) {
  const phase = useValue(`${base}/phase`) || 'setup'
  const rolesRaw = useValue(`${base}/roles`)
  const center = useValue(`${base}/center`)
  const nightStep = useValue(`${base}/nightStep`) || 0
  const robberTarget = useValue(`${base}/robber`)
  const tm = useValue(`${base}/tm`)
  const seer = useValue(`${base}/seer`)
  const myVote = useValue(`${base}/votes/${me.id}`)
  const nameOf = useNameOf(players)

  const steps = useMemo(() => activeSteps(rolesRaw), [rolesRaw])
  const orig = rolesRaw?.[me.id]
  const robberActor = robberOf(rolesRaw)
  // 내가 아는 역할(도둑이 훔쳤으면 새 역할, 나머지는 원본 — 바뀐 걸 모름)
  const known = me.id === robberActor && robberTarget ? rolesRaw?.[robberTarget] : orig
  const others = players.filter((p) => p.id !== me.id)

  if (phase === 'setup' || !orig) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--ink-soft)' }}>
        <div className="text-5xl mb-2">🐺</div>진행자가 역할을 나눠주는 중…
      </div>
    )
  }

  const MyCard = () => (
    <div className="clay p-4 text-center" style={{ background: ROLES[known].team === 'wolf' ? 'var(--c-coral)' : 'var(--c-grape)', color: '#fff' }}>
      <div className="text-sm opacity-90">내 역할{known !== orig ? ' (도둑질로 바뀜)' : ''} · {ROLES[known].teamName}</div>
      <div className="text-5xl mt-1">{ROLES[known].emoji}</div>
      <div className="font-display text-2xl">{ROLES[known].name}</div>
      <div className="text-xs opacity-90 mt-1">{ROLES[known].desc}</div>
      <div className="clay-inset mt-2 px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.18)' }}>🎯 {ROLES[known].goal}</div>
    </div>
  )

  // ── 밤 ──
  if (phase === 'night') {
    const cur = steps[nightStep]
    const myTurn = orig === cur
    return (
      <div className="space-y-3">
        <MyCard />
        {!myTurn ? (
          <div className="text-center py-6" style={{ color: 'var(--ink-soft)' }}>
            <div className="text-4xl">😴</div>
            <p className="mt-2">눈 감고 대기… <span className="text-sm">(지금은 {ROLES[cur].name}의 시간)</span></p>
          </div>
        ) : cur === 'werewolf' ? (
          <WolfAction rolesRaw={rolesRaw} me={me} nameOf={nameOf} others={others} center={center} />
        ) : cur === 'seer' ? (
          <SeerAction base={base} seer={seer} rolesRaw={rolesRaw} center={center} others={others} nameOf={nameOf} />
        ) : cur === 'robber' ? (
          <RobberAction base={base} robberTarget={robberTarget} rolesRaw={rolesRaw} others={others} nameOf={nameOf} />
        ) : cur === 'troublemaker' ? (
          <TmAction base={base} tm={tm} others={others} />
        ) : null}
      </div>
    )
  }

  // ── 낮 ──
  if (phase === 'day') {
    return (
      <div className="space-y-3">
        <MyCard />
        <div className="text-center py-2" style={{ color: 'var(--ink-soft)' }}>☀️ 토론하세요! 늑대를 찾아보세요.<br /><span className="text-sm">밤에 내 역할이 바뀌었을 수도 있어요.</span></div>
      </div>
    )
  }

  // ── 투표 ──
  if (phase === 'vote') {
    return (
      <div className="space-y-3">
        <div className="text-center font-display text-xl">🗳️ 늑대로 의심되는 한 명 지목</div>
        <div className="grid grid-cols-2 gap-2">
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => dbSet(`${base}/votes/${me.id}`, p.id)}
              className="clay-btn py-3 font-bold"
              style={myVote === p.id ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {p.nickname}
            </button>
          ))}
        </div>
        {myVote && <p className="text-center text-sm" style={{ color: 'var(--ink-soft)' }}>지목: {nameOf(myVote)} · 공개 전까지 변경 가능</p>}
      </div>
    )
  }

  // ── 결과 ──
  const final = computeFinal(rolesRaw, robberActor, robberTarget, tm)
  const myFinal = final[me.id]
  const team = ROLES[myFinal]?.team
  return (
    <div className="text-center space-y-3">
      <div className="clay p-4" style={{ background: team === 'wolf' ? 'var(--c-coral)' : 'var(--c-mint)', color: '#fff' }}>
        <div className="text-sm opacity-90">내 최종 역할</div>
        <div className="text-5xl mt-1">{ROLES[myFinal].emoji}</div>
        <div className="font-display text-2xl">{ROLES[myFinal].name}</div>
        {myFinal !== orig && <div className="text-xs opacity-90 mt-1">밤엔 {roleName(orig)}였어요</div>}
      </div>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면에서 승패와 전체 역할을 확인하세요!</p>
    </div>
  )
}

/* ── 밤 행동 UI ── */
function WolfAction({ rolesRaw, me, nameOf, others, center }) {
  const mates = others.filter((p) => rolesRaw?.[p.id] === 'werewolf')
  const lone = mates.length === 0
  return (
    <div className="clay-inset p-4 text-center">
      <div className="font-display text-lg">🐺 동료 늑대 확인</div>
      {lone ? (
        <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>당신은 <b>외로운 늑대</b> 🐺<br /><span className="text-sm">동료가 없어요(다른 늑대는 가운데 카드에).</span></p>
      ) : (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {mates.map((p) => <span key={p.id} className="clay-inset px-3 py-1.5 font-bold" style={{ background: 'var(--c-coral)', color: '#fff' }}>{p.nickname}</span>)}
        </div>
      )}
    </div>
  )
}

function SeerAction({ base, seer, rolesRaw, center, others, nameOf }) {
  const [mode, setMode] = useState(null) // 'player' | 'center'
  const done = !!seer
  if (done) {
    return (
      <div className="clay-inset p-4 text-center">
        <div className="font-display text-lg">🔮 확인 완료</div>
        {seer.kind === 'player' ? (
          <p className="mt-2">{nameOf(seer.target)} 님은 <b>{roleName(rolesRaw?.[seer.target])}</b></p>
        ) : (
          <p className="mt-2">가운데 카드 2장: <b>{roleName(center?.[0])}</b>, <b>{roleName(center?.[1])}</b></p>
        )}
      </div>
    )
  }
  return (
    <div className="clay-inset p-4 text-center">
      <div className="font-display text-lg">🔮 한 명의 역할 또는 가운데 2장 확인</div>
      {!mode ? (
        <div className="flex justify-center gap-2 mt-3">
          <Button onClick={() => setMode('player')}>한 명 지목</Button>
          <Button variant="ghost" onClick={() => dbSet(`${base}/seer`, { kind: 'center' })}>가운데 2장</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {others.map((p) => (
            <button key={p.id} onClick={() => dbSet(`${base}/seer`, { kind: 'player', target: p.id })} className="clay-btn py-2 font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function RobberAction({ base, robberTarget, rolesRaw, others, nameOf }) {
  if (robberTarget) {
    return (
      <div className="clay-inset p-4 text-center">
        <div className="font-display text-lg">🥷 도둑질 완료</div>
        <p className="mt-2">{nameOf(robberTarget)} 님과 교환 → 내 새 역할 <b>{roleName(rolesRaw?.[robberTarget])}</b></p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>이제 당신은 이 역할 편이에요.</p>
      </div>
    )
  }
  return (
    <div className="clay-inset p-4 text-center">
      <div className="font-display text-lg">🥷 역할을 훔칠 한 명 선택</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {others.map((p) => (
          <button key={p.id} onClick={() => dbSet(`${base}/robber`, p.id)} className="clay-btn py-2 font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
        ))}
      </div>
    </div>
  )
}

function TmAction({ base, tm, others }) {
  const [a, setA] = useState(null)
  if (tm) {
    return (
      <div className="clay-inset p-4 text-center">
        <div className="font-display text-lg">🃏 교환 완료</div>
        <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>두 사람의 역할을 몰래 맞바꿨어요(내용은 비밀).</p>
      </div>
    )
  }
  const pick = (pid) => {
    if (!a) { setA(pid); return }
    if (a === pid) { setA(null); return }
    dbSet(`${base}/tm`, { a, b: pid })
  }
  return (
    <div className="clay-inset p-4 text-center">
      <div className="font-display text-lg">🃏 맞바꿀 두 사람 선택 {a ? '(한 명 더)' : ''}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {others.map((p) => (
          <button key={p.id} onClick={() => pick(p.id)} className="clay-btn py-2 font-bold" style={a === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
        ))}
      </div>
    </div>
  )
}

export default {
  id: 'werewolf',
  name: '한밤의 늑대인간',
  emoji: '🐺',
  tagline: '비밀 역할 · 밤에 뒤섞임 · 토론으로 늑대 찾기',
  genres: ['mind', 'party'],
  traits: [],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
