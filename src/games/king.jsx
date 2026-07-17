// 왕게임 — 호스트가 랜덤/지목으로 '왕'을 뽑으면, 나머지에게 비밀 번호(1~N)가 배정된다.
// 번호는 '각 참가자 본인 폰'에만 보이고, 왕·호스트 화면에는 안 보인다.
// 왕이 "○번과 △번!" 식으로 번호를 불러 명령하면 해당 번호인 사람이 수행. (명령은 오프라인)
import { useState } from 'react'
import { useValue, dbSet } from '../lib/db'
import { Button } from '../components/ui'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 왕 명령 아이디어 (왕 폰에서만, 재미용) — ○/△ 자리에 왕이 원하는 번호를 넣어 외침
const CMDS = [
  '○번과 △번, 러브샷! 🍻',
  '○번, 지금 애교 한 번 🥰',
  '○번과 △번 자리 바꾸기',
  '○번, 옆 사람 칭찬 한마디',
  '○번과 △번 손잡고 3초 🤝',
  '○번, 벌칙주 원샷 🍺',
  '가장 낮은 번호가 노래 한 소절 🎤',
  '○번이 왕에게 술 따르기',
  '○번과 △번 눈싸움, 진 사람 벌주 👀',
  '○번, 성대모사 하나 🎭',
  '○번과 △번 백허그 3초 🫂',
  '홀수 번호 전원 건배 🍻',
  '○번, 왕 시키는 대로 몸개그 하나 🤪',
  '○번과 △번, 텐션 최고로 하이파이브 ✋',
  '짝수 번호 전원 원샷 🍺',
  '○번, 옆 사람에게 러브레터 즉석 낭독 💌',
  '○번, 지금 최애 노래 후렴구 떼창 🎶',
  '○번과 △번, 가위바위보 진 사람 벌주 ✊',
  '○번, 왕 성대모사 하기 👑',
  '○번, 이 자리에서 제일 웃긴 표정 😝',
]

// 🔞 성인 명령 (adultEnabled ON일 때만 왕 폰에 노출)
const ADULT_CMDS = [
  '○번과 △번, 진한 백허그 5초 🫂',
  '○번, △번 귀에 대고 달달하게 속삭이기 🤫',
  '○번과 △번, 러브샷 원샷! 🍷',
  '○번, △번에게 윙크 3연발 😉',
  '○번과 △번, 어깨동무하고 볼 맞대기',
  '○번, 섹시 댄스 5초 💃',
  '○번과 △번, 눈 안 피하고 10초 응시 👀',
  '○번, △번 무릎에 3초 앉기',
  '○번과 △번, 손등에 뽀뽀 💋',
  '○번, 가장 야한 표정 지어보기 😏',
  '○번과 △번, 등 마사지 10초 💆',
  '○번, △번에게 오늘 밤 멘트 한마디 🌙',
]

function assignNumbers(players, kingId) {
  const others = players.filter((p) => p.id !== kingId)
  const nums = shuffle(others.map((_, i) => i + 1)) // 1..(N-1) 섞기
  const numbers = {}
  others.forEach((p, i) => { numbers[p.id] = nums[i] })
  return numbers
}

/* ═══════════════ 호스트 (번호는 절대 표시 안 함) ═══════════════ */
function HostView({ base, players }) {
  const kingId = useValue(`${base}/kingId`)
  const numbers = useValue(`${base}/numbers`)
  const revealed = useValue(`${base}/revealed`)
  const king = players.find((p) => p.id === kingId)
  const numberCount = players.filter((p) => p.id !== kingId).length

  // 번호 → 사람 매핑 (공개용, 번호순 정렬)
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const roster = numbers
    ? Object.entries(numbers).map(([pid, n]) => ({ n, name: byId[pid]?.nickname || '?' })).sort((a, b) => a.n - b.n)
    : []

  const setKing = (kid) => dbSet(base, { kingId: kid, numbers: assignNumbers(players, kid) })
  const randomKing = () => { if (players.length) setKing(players[Math.floor(Math.random() * players.length)].id) }
  const reshuffle = () => { if (kingId) { dbSet(`${base}/numbers`, assignNumbers(players, kingId)); dbSet(`${base}/revealed`, false) } }

  if (players.length < 2) {
    return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>2명 이상 있어야 시작할 수 있어요. 👑</p>
  }

  if (!kingId) {
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-3">👑 누가 왕이 될까요?</p>
        <Button className="text-2xl px-8 py-3 mb-4" onClick={randomKing}>🎲 랜덤으로 왕 뽑기</Button>
        <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>또는 직접 지목</div>
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <button key={p.id} onClick={() => setKing(p.id)} className="clay-btn px-3 py-1.5 font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>이번 판의 왕은</div>
      <div className="font-display text-5xl mt-1 animate-pop">👑 {king?.nickname || '?'}</div>
      <div className="clay-inset mt-4 py-4 px-4 max-w-sm mx-auto">
        <div className="text-4xl">🔢🙈</div>
        <p className="mt-2 font-display">나머지 {numberCount}명에게 <b>1~{numberCount}번</b> 비밀 배정 완료</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>번호는 각자 폰에만! 왕·이 화면엔 안 보여요.</p>
      </div>
      <p className="mt-4 font-display text-lg">왕이 “○번과 △번!” 하고 명령하세요 📣</p>

      {/* 번호 공개 — 끝나고 누가 몇 번이었는지 밝히기 */}
      <div className="mt-4">
        <Button variant={revealed ? 'ghost' : 'warn'} onClick={() => dbSet(`${base}/revealed`, !revealed)}>
          {revealed ? '🙈 번호 다시 숨기기' : '👁 번호 공개 (누가 몇 번?)'}
        </Button>
        {revealed && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {roster.map((r) => (
              <span key={r.n} className="clay-inset px-3 py-1.5 font-bold animate-pop">
                <span className="font-display" style={{ color: 'var(--c-grape)' }}>{r.n}</span>. {r.name}
              </span>
            ))}
            {!roster.length && <p className="py-2" style={{ color: 'var(--ink-soft)' }}>배정된 번호가 없어요.</p>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={randomKing}>🎲 새 왕 뽑기</Button>
        <Button variant="ghost" onClick={reshuffle}>🔀 번호만 다시 섞기</Button>
        <Button variant="ghost" onClick={() => dbSet(base, null)}>↩ 왕 다시 뽑기</Button>
      </div>
    </div>
  )
}

/* ═══════════════ 플레이어 (본인 번호만 본인 폰에) ═══════════════ */
function PlayerView({ base, meta, players, me }) {
  const kingId = useValue(`${base}/kingId`)
  const myNumber = useValue(`${base}/numbers/${me.id}`)
  const king = players.find((p) => p.id === kingId)
  const cmdPool = meta?.adultEnabled ? [...CMDS, ...ADULT_CMDS] : CMDS
  const [cmd, setCmd] = useState(() => CMDS[0])

  if (!kingId) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">👑</div>
        <p className="mt-3 font-display text-xl">호스트가 왕을 뽑는 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
      </div>
    )
  }

  // 내가 왕 — 번호는 안 보임
  if (me.id === kingId) {
    const total = players.filter((p) => p.id !== kingId).length
    return (
      <div className="text-center">
        <div className="clay p-6" style={{ background: 'var(--c-lemon)', color: 'var(--ink)' }}>
          <div className="text-6xl animate-pop">👑</div>
          <div className="font-display text-3xl mt-2">당신이 왕!</div>
          <p className="mt-2">1번부터 <b>{total}번</b>까지 있어요.<br />번호를 불러 명령하세요 📣</p>
        </div>
        <div className="clay-inset mt-4 p-4">
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>명령 아이디어</div>
          <div className="font-display text-xl mt-1">{cmd}</div>
          <button onClick={() => setCmd(cmdPool[Math.floor(Math.random() * cmdPool.length)])} className="clay-btn mt-3 px-4 py-2 text-sm" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 다른 명령{meta?.adultEnabled ? ' 🔞' : ''}</button>
        </div>
      </div>
    )
  }

  // 왕 배정 후 들어온 사람 등 번호 미배정
  if (myNumber == null) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🙋</div>
        <p className="mt-3 font-display text-xl">이번 판은 번호가 없어요</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>다음 ‘새 왕 뽑기’ 때 참여됩니다.</p>
      </div>
    )
  }

  // 내 비밀 번호
  return (
    <div className="text-center">
      <p style={{ color: 'var(--ink-soft)' }}>👑 왕: {king?.nickname} · 내 비밀 번호</p>
      <div className="clay mt-3 py-10" style={{ background: 'var(--c-grape)', color: '#fff' }}>
        <div className="opacity-80">나는</div>
        <div className="font-display text-8xl leading-none mt-1">{myNumber}</div>
        <div className="opacity-80 mt-1">번</div>
      </div>
      <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>🙈 주변에 안 보이게! 왕이 내 번호를 부르면 수행하세요.</p>
    </div>
  )
}

export default {
  id: 'king',
  name: '왕게임',
  emoji: '👑',
  tagline: '왕의 명령 · 비밀 번호 (본인 폰만)',
  genres: ['party'],
  traits: ['anon'],
  controls: { mode: 'self' }, // 왕 선택이 곧 시작 · 프레임워크 컨트롤 숨김
  HostView,
  PlayerView,
}
