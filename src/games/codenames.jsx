// 코드네임 — 2팀. 25단어 5×5 판. 각 단어는 몰래 팀A(9)/팀B(8)/중립(7)/암살자(1)로 배정된다.
// 흐름: ①팀별 스파이마스터 지정(그 사람 폰만 키를 봄) → ②판 배분 → ③스파이마스터가 오프라인으로
//   "한 단어+숫자" 힌트 → ④활성 팀원이 폰에서 타일 '투표' → 호스트 화면에 득표수만큼 색이 진해짐
//   → ⑤진행자가 타일을 탭해 '확정 공개'(자기 팀=계속, 중립·상대=턴 넘김, 암살자=즉패).
// 한 명이 눌러 전체 공개되지 않도록, 실제 공개·턴은 진행자만. 키는 지정된 스파이마스터 폰에만.
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

const WORDS = [
  '사과', '바다', '별', '우주', '학교', '병원', '기차', '바람', '거울', '사자',
  '커피', '피아노', '축구', '얼음', '태양', '달', '용', '로봇', '천사', '악마',
  '보물', '유령', '마법', '왕관', '다리', '섬', '숲', '동굴', '폭탄', '열쇠',
  '가면', '나침반', '망토', '방패', '화살', '독', '거미', '고래', '펭귄', '호랑이',
  '번개', '무지개', '화산', '사막', '눈사람', '풍선', '탱크', '잠수함', '등대', '시계',
  '반지', '지도', '깃발', '촛불', '거북이', '여우', '늑대', '박쥐', '문어', '공룡',
]

const shuffle = (a) => {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function makeBoard() {
  const words = shuffle(WORDS).slice(0, 25)
  const roles = [...Array(9).fill('A'), ...Array(8).fill('B'), ...Array(7).fill('N'), 'X']
  return { words, key: shuffle(roles) }
}

function useRemain(key, revealed) {
  return useMemo(() => {
    if (!key) return { A: 9, B: 8 }
    let A = 0, B = 0
    key.forEach((r, i) => { if (!revealed[i]) { if (r === 'A') A++; if (r === 'B') B++ } })
    return { A, B }
  }, [key, revealed])
}

/* ───────────────────────── 호스트 ───────────────────────── */
function HostView({ base, players, teams }) {
  const words = useValue(`${base}/words`)
  const key = useValue(`${base}/key`)
  const revealed = useValue(`${base}/revealed`) || {}
  const turn = useValue(`${base}/turn`) || 'A'
  const winner = useValue(`${base}/winner`)
  const spy = useValue(`${base}/spymaster`) || {}
  const votesRaw = useValue(`${base}/votes`) || {}
  const remain = useRemain(key, revealed)

  const [tA, tB] = teams
  const twoTeams = teams.length >= 2
  const nameOf = (pid) => players.find((p) => p.id === pid)?.nickname || '?'
  const teamOf = (idx) => (idx === 'A' ? tA : tB)
  const membersOf = (teamId) => players.filter((p) => p.teamId === teamId && p.connected !== false)
  const colorOf = (role) => role === 'A' ? (tA?.color || 'var(--c-grape)') : role === 'B' ? (tB?.color || 'var(--c-coral)') : role === 'X' ? '#1f2937' : '#c9b896'

  const setSpy = (side, pid) => dbUpdate(`${base}/spymaster`, { [side]: pid })
  const deal = () => dbSet(base, { ...makeBoard(), revealed: null, turn: 'A', winner: null, spymaster: spy, votes: null })
  const resetAll = () => dbSet(base, null)

  if (!twoTeams) {
    return <div className="text-center py-8"><div className="text-5xl">🔑</div><p className="mt-3 font-display text-xl" style={{ color: 'var(--c-coral)' }}>팀이 2개 이상이어야 해요 (⋮ 설정·팀 설정에서 추가)</p></div>
  }

  // ① 스파이마스터 지정 (양팀 다 정해야 판 배분)
  if (!spy.A || !spy.B) {
    const Picker = ({ side }) => {
      const t = teamOf(side)
      return (
        <div className="clay-inset p-3">
          <div className="font-display" style={{ color: t?.color }}>{t?.name} 스파이마스터</div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {membersOf(t?.id).map((p) => (
              <button key={p.id} onClick={() => setSpy(side, p.id)} className="clay-btn px-3 py-1.5 text-sm font-bold"
                style={spy[side] === p.id ? { background: t?.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {spy[side] === p.id ? '🔑 ' : ''}{p.nickname}
              </button>
            ))}
            {!membersOf(t?.id).length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>팀원이 없어요.</span>}
          </div>
        </div>
      )
    }
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-1">🔑 스파이마스터를 먼저 정해요</p>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>지정된 사람 폰에만 정답 키가 떠요 · 나머지는 못 봐요</p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          <Picker side="A" /><Picker side="B" />
        </div>
        <Button variant="ok" className="mt-4" onClick={deal} disabled={!spy.A || !spy.B}>🃏 이 구성으로 판 시작</Button>
      </div>
    )
  }

  // ② 판 배분 전
  if (!words) {
    return (
      <div className="text-center">
        <Button variant="ok" onClick={deal}>🃏 판 시작 (단어 배분)</Button>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>🔑 {tA?.name}: {nameOf(spy.A)} · {tB?.name}: {nameOf(spy.B)}</p>
        <button onClick={() => dbSet(`${base}/spymaster`, null)} className="mt-2 text-xs underline" style={{ color: 'var(--ink-soft)' }}>스파이마스터 다시 정하기</button>
      </div>
    )
  }

  // 활성팀 오퍼레이티브(스파이마스터 제외)의 타일 투표 집계
  const activeOps = membersOf(teamOf(turn)?.id).filter((p) => p.id !== spy[turn])
  const denom = Math.max(1, activeOps.length)
  const votesForTile = (i) => activeOps.filter((p) => votesRaw[p.id] === i).length

  const reveal = (i) => {
    if (winner || revealed[i]) return
    const role = key[i]
    const other = turn === 'A' ? 'B' : 'A'
    const nextRevealed = { ...revealed, [i]: true }
    const allRevealed = (r) => key.every((rr, idx) => rr !== r || nextRevealed[idx])
    let winnerNext = null, turnNext = turn
    if (role === 'X') winnerNext = other // 암살자 → 현재 팀 패배
    else if (role === 'A') { if (allRevealed('A')) winnerNext = 'A'; if (turn !== 'A') turnNext = other }
    else if (role === 'B') { if (allRevealed('B')) winnerNext = 'B'; if (turn !== 'B') turnNext = other }
    else turnNext = other // 중립 → 턴 넘김
    dbUpdate(base, { [`revealed/${i}`]: true, turn: turnNext, votes: null, ...(winnerNext ? { winner: winnerNext } : {}) })
  }
  const passTurn = () => dbUpdate(base, { turn: turn === 'A' ? 'B' : 'A', votes: null })

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display" style={{ color: tA?.color }}>{tA?.name} {remain.A}</span>
        {winner ? (
          <span className="font-display text-xl animate-pop" style={{ color: teamOf(winner)?.color }}>🏆 {teamOf(winner)?.name} 승리!</span>
        ) : (
          <span className="clay-inset px-3 py-1 font-display text-sm" style={{ color: teamOf(turn)?.color }}>▶ {teamOf(turn)?.name} 차례 · 진행자가 탭해 공개</span>
        )}
        <span className="font-display" style={{ color: tB?.color }}>{remain.B} {tB?.name}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 max-w-2xl mx-auto">
        {words.map((w, i) => {
          const on = !!revealed[i]
          const role = key?.[i]
          const v = !on ? votesForTile(i) : 0
          const frac = v / denom
          const bg = on
            ? colorOf(role)
            : v > 0
              ? `color-mix(in srgb, ${teamOf(turn)?.color} ${Math.round(20 + 55 * frac)}%, var(--surface))`
              : 'var(--surface)'
          return (
            <button key={i} onClick={() => reveal(i)} disabled={on || !!winner}
              className="relative rounded-lg py-3 px-1 font-bold text-sm flex items-center justify-center text-center leading-tight disabled:cursor-default"
              style={{ background: bg, color: on && role !== 'N' ? '#fff' : 'var(--ink)', border: on ? 'none' : '1px solid var(--surface-2)' }}>
              {on && role === 'X' ? '💀' : w}
              {!on && v > 0 && <span className="absolute -top-1 -right-1 text-[10px] rounded-full w-4 h-4 flex items-center justify-center" style={{ background: teamOf(turn)?.color, color: '#fff' }}>{v}</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        {!winner && <Button variant="warn" onClick={passTurn}>⏭ {teamOf(turn)?.name} 턴 넘기기</Button>}
        <Button variant="ghost" onClick={deal}>🔄 새 게임</Button>
        <button onClick={resetAll} className="text-xs underline" style={{ color: 'var(--ink-soft)' }}>스파이마스터부터 다시</button>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>🔑 {tA?.name}: {nameOf(spy.A)} · {tB?.name}: {nameOf(spy.B)} · 팀원 투표수만큼 색이 진해져요</p>
    </div>
  )
}

/* ───────────────────────── 플레이어 ───────────────────────── */
function PlayerView({ base, players, teams, me }) {
  const words = useValue(`${base}/words`)
  const key = useValue(`${base}/key`)
  const revealed = useValue(`${base}/revealed`) || {}
  const turn = useValue(`${base}/turn`) || 'A'
  const winner = useValue(`${base}/winner`)
  const spy = useValue(`${base}/spymaster`) || {}
  const votesRaw = useValue(`${base}/votes`) || {}
  const remain = useRemain(key, revealed)

  const [tA, tB] = teams
  const myTeam = me.teamId === tA?.id ? 'A' : me.teamId === tB?.id ? 'B' : null
  const teamOf = (idx) => (idx === 'A' ? tA : tB)
  const iAmSpy = myTeam && spy[myTeam] === me.id
  const myTurn = !winner && myTeam && myTeam === turn && !iAmSpy
  const myVote = votesRaw[me.id]
  const colorOf = (role) => role === 'A' ? (tA?.color || 'var(--c-grape)') : role === 'B' ? (tB?.color || 'var(--c-coral)') : role === 'X' ? '#1f2937' : '#c9b896'

  if (!words) {
    const iAmSpyPending = myTeam && spy[myTeam] === me.id
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🔑</div>
        <p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>
          {spy.A && spy.B ? '진행자가 판을 만드는 중…' : '진행자가 스파이마스터를 정하는 중…'}
        </p>
        {iAmSpyPending && <p className="mt-2 font-display" style={{ color: 'var(--c-grape)' }}>🔑 당신이 {teamOf(myTeam)?.name} 스파이마스터!</p>}
      </div>
    )
  }

  // 오퍼레이티브 투표 (활성 턴일 때만)
  const vote = (i) => {
    if (!myTurn || revealed[i]) return
    dbSet(`${base}/votes/${me.id}`, myVote === i ? null : i)
    if (navigator.vibrate) navigator.vibrate(12)
  }
  const teamActiveOps = players.filter((p) => p.teamId === teamOf(turn)?.id && p.id !== spy[turn] && p.connected !== false)
  const votesForTile = (i) => teamActiveOps.filter((p) => votesRaw[p.id] === i).length

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-display" style={{ color: tA?.color }}>{tA?.name} {remain.A}</span>
        {winner ? <span className="font-display" style={{ color: teamOf(winner)?.color }}>🏆 {teamOf(winner)?.name} 승</span>
          : <span style={{ color: teamOf(turn)?.color }}>▶ {teamOf(turn)?.name}{myTurn ? ' (우리 차례!)' : ''}</span>}
        <span className="font-display" style={{ color: tB?.color }}>{remain.B} {tB?.name}</span>
      </div>

      {iAmSpy && (
        <div className="clay-inset px-3 py-1.5 mb-2 text-sm" style={{ color: 'var(--c-coral)' }}>
          🔑 나는 <b>{teamOf(myTeam)?.name} 스파이마스터</b> · 말로 "한 단어+숫자" 힌트! (카드는 진행자가 공개)
        </div>
      )}

      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {words.map((w, i) => {
          const on = !!revealed[i]
          const role = key?.[i]
          const showKey = iAmSpy && !on // 스파이마스터만 정답 색 테두리
          const mine = myVote === i
          const v = !on && myTurn ? votesForTile(i) : 0
          const style = on
            ? { background: colorOf(role), color: role === 'N' ? 'var(--ink)' : '#fff' }
            : showKey
              ? { background: 'var(--surface)', color: colorOf(role), border: `2px solid ${colorOf(role)}` }
              : mine
                ? { background: teamOf(myTeam)?.color, color: '#fff', border: 'none' }
                : { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--surface-2)' }
          return (
            <button key={i} onClick={() => vote(i)} disabled={!myTurn || on}
              className="relative rounded-md py-2.5 px-0.5 font-bold text-[11px] leading-tight"
              style={style}>
              {on && role === 'X' ? '💀' : w}
              {!mine && v > 0 && <span className="absolute -top-1 -right-1 text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center" style={{ background: teamOf(turn)?.color, color: '#fff' }}>{v}</span>}
            </button>
          )
        })}
      </div>

      {winner ? (
        <p className="mt-3 font-display text-lg" style={{ color: teamOf(winner)?.color }}>🏆 {teamOf(winner)?.name} 승리!</p>
      ) : iAmSpy ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>테두리 색 = 우리 팀 단어. 말로 힌트만 주세요.</p>
      ) : myTurn ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{myVote != null ? '투표함 · 진행자가 공개해요' : '고를 단어를 탭해 투표! 진행자가 확정 공개'}</p>
      ) : myTeam ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>상대 팀 차례 · 기다려요</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>이 게임은 2팀만 참여해요 (관전 중)</p>
      )}
    </div>
  )
}

export default {
  id: 'codenames',
  name: '코드네임',
  emoji: '🔑',
  tagline: '2팀 · 한 단어 힌트로 우리 팀 단어 찾기',
  genres: ['brain', 'mind'],
  traits: ['team'],
  controls: { prompt: false, mode: 'self' },
  HostView,
  PlayerView,
}
