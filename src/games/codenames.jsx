// 코드네임 — 2팀. 25단어 5×5 판. 각 단어는 몰래 팀A(9)/팀B(8)/중립(7)/암살자(1)로 배정된다.
// 팀 스파이마스터(폰에서 '🔑 키 보기')가 한 단어+숫자 힌트를 오프라인으로 말하면, 팀원이 자기 팀 단어를 탭.
// 자기 팀=계속, 중립·상대 단어=턴 넘김, 암살자=즉시 패배. 자기 팀 단어 전부 공개하면 승리.
// 앱은 판 배분 + 키 표시(스파이마스터 폰만) + 공개/턴/승패 판정을 맡는다.
import { useMemo, useState } from 'react'
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

// 25단어 + 키(A9/B8/N7/X1) 생성. 시작팀 A는 9개.
function makeBoard() {
  const words = shuffle(WORDS).slice(0, 25)
  const roles = [...Array(9).fill('A'), ...Array(8).fill('B'), ...Array(7).fill('N'), 'X']
  return { words, key: shuffle(roles) }
}

function HostView({ base, players, teams }) {
  const words = useValue(`${base}/words`)
  const key = useValue(`${base}/key`)
  const revealed = useValue(`${base}/revealed`) || {}
  const turn = useValue(`${base}/turn`) || 'A'
  const winner = useValue(`${base}/winner`)
  const twoTeams = teams.length >= 2
  const [tA, tB] = teams

  const remain = useMemo(() => {
    if (!key) return { A: 9, B: 8 }
    let A = 0, B = 0
    key.forEach((r, i) => { if (!revealed[i]) { if (r === 'A') A++; if (r === 'B') B++ } })
    return { A, B }
  }, [key, revealed])

  const start = () => {
    const b = makeBoard()
    dbSet(base, { ...b, revealed: null, turn: 'A', winner: null })
  }

  const colorOf = (role, on) => {
    if (role === 'A') return tA?.color || 'var(--c-grape)'
    if (role === 'B') return tB?.color || 'var(--c-coral)'
    if (role === 'X') return '#1f2937'
    return on ? '#c9b896' : 'var(--surface-2)' // 중립
  }

  if (!twoTeams) {
    return <div className="text-center py-8"><div className="text-5xl">🔑</div><p className="mt-3 font-display text-xl" style={{ color: 'var(--c-coral)' }}>팀이 2개 이상이어야 해요 (팀 설정에서 추가)</p></div>
  }

  if (!words) {
    return (
      <div className="text-center">
        <Button variant="ok" onClick={start}>🔑 판 만들기</Button>
        <p className="mt-4 font-display text-lg" style={{ color: 'var(--ink-soft)' }}>
          {tA?.name}({remain.A}) vs {tB?.name}({remain.B}) · 각 팀 스파이마스터가 폰에서 키를 봐요
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display" style={{ color: tA?.color }}>{tA?.name} {remain.A}</span>
        {winner ? (
          <span className="font-display text-xl animate-pop" style={{ color: (winner === 'A' ? tA : tB)?.color }}>🏆 {(winner === 'A' ? tA : tB)?.name} 승리!</span>
        ) : (
          <span className="clay-inset px-3 py-1 font-display text-sm" style={{ color: (turn === 'A' ? tA : tB)?.color }}>▶ {(turn === 'A' ? tA : tB)?.name} 차례</span>
        )}
        <span className="font-display" style={{ color: tB?.color }}>{remain.B} {tB?.name}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 max-w-2xl mx-auto">
        {words.map((w, i) => {
          const on = !!revealed[i]
          const role = key?.[i]
          return (
            <div key={i} className="rounded-lg py-3 px-1 font-bold text-sm flex items-center justify-center text-center leading-tight"
              style={on ? { background: colorOf(role, true), color: role === 'N' ? 'var(--ink)' : '#fff', opacity: 0.95 } : { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--surface-2)' }}>
              {on && role === 'X' ? '💀' : w}
            </div>
          )
        })}
      </div>
      <div className="mt-3"><Button variant="ghost" onClick={start}>🔄 새 게임</Button></div>
    </div>
  )
}

function PlayerView({ base, players, teams, me }) {
  const words = useValue(`${base}/words`)
  const key = useValue(`${base}/key`)
  const revealed = useValue(`${base}/revealed`) || {}
  const turn = useValue(`${base}/turn`) || 'A'
  const winner = useValue(`${base}/winner`)
  const [spy, setSpy] = useState(false)
  const [tA, tB] = teams
  const myTeam = me.teamId === tA?.id ? 'A' : me.teamId === tB?.id ? 'B' : null
  const myTurn = !winner && myTeam && myTeam === turn

  const remain = useMemo(() => {
    if (!key) return { A: 9, B: 8 }
    let A = 0, B = 0
    key.forEach((r, i) => { if (!revealed[i]) { if (r === 'A') A++; if (r === 'B') B++ } })
    return { A, B }
  }, [key, revealed])

  if (!words) {
    return <div className="text-center py-10"><div className="text-5xl">🔑</div><p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 판을 만드는 중…</p></div>
  }

  const colorOf = (role) => role === 'A' ? (tA?.color || 'var(--c-grape)') : role === 'B' ? (tB?.color || 'var(--c-coral)') : role === 'X' ? '#1f2937' : '#c9b896'

  const tap = (i) => {
    if (!myTurn || revealed[i]) return
    const role = key[i]
    const nextRevealed = { ...revealed, [i]: true }
    let winnerNext = null, turnNext = turn
    if (role === 'X') winnerNext = myTeam === 'A' ? 'B' : 'A' // 암살자 → 상대 승
    else {
      // 전부 공개됐는지 검사
      const allRevealed = (r) => key.every((rr, idx) => rr !== r || nextRevealed[idx])
      if (role === 'A' && allRevealed('A')) winnerNext = 'A'
      else if (role === 'B' && allRevealed('B')) winnerNext = 'B'
      if (role !== myTeam) turnNext = myTeam === 'A' ? 'B' : 'A' // 내 팀 아니면 턴 넘김
    }
    dbUpdate(base, { [`revealed/${i}`]: true, turn: turnNext, ...(winnerNext ? { winner: winnerNext } : {}) })
    if (navigator.vibrate) navigator.vibrate(15)
  }
  const passTurn = () => { if (myTurn) dbSet(`${base}/turn`, myTeam === 'A' ? 'B' : 'A') }

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-display" style={{ color: tA?.color }}>{tA?.name} {remain.A}</span>
        {winner ? <span className="font-display" style={{ color: (winner === 'A' ? tA : tB)?.color }}>🏆 {(winner === 'A' ? tA : tB)?.name} 승</span>
          : <span style={{ color: (turn === 'A' ? tA : tB)?.color }}>▶ {(turn === 'A' ? tA : tB)?.name} 차례{myTurn ? ' (우리!)' : ''}</span>}
        <span className="font-display" style={{ color: tB?.color }}>{remain.B} {tB?.name}</span>
      </div>

      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {words.map((w, i) => {
          const on = !!revealed[i]
          const role = key?.[i]
          const showKey = spy && !on
          const style = on
            ? { background: colorOf(role), color: role === 'N' ? 'var(--ink)' : '#fff' }
            : showKey
              ? { background: 'var(--surface)', color: colorOf(role), border: `2px solid ${colorOf(role)}` }
              : { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--surface-2)' }
          return (
            <button key={i} onClick={() => tap(i)} disabled={!myTurn || on}
              className="rounded-md py-2.5 px-0.5 font-bold text-[11px] leading-tight"
              style={style}>
              {on && role === 'X' ? '💀' : w}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button onClick={() => setSpy((v) => !v)} className="clay-btn px-3 py-2 text-sm font-bold"
          style={spy ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
          🔑 {spy ? '키 숨기기' : '스파이마스터 보기'}
        </button>
        {myTurn && <Button variant="ghost" onClick={passTurn}>턴 넘기기</Button>}
      </div>
      {spy && <p className="mt-2 text-xs" style={{ color: 'var(--c-coral)' }}>⚠️ 스파이마스터만! 팀원은 보면 안 돼요</p>}
      {!myTeam && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>이 게임은 2팀만 참여해요 (관전 중)</p>}
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
