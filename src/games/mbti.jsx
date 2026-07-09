// MBTI 맞히기 — 호스트가 질문자를 지목 → 질문자가 자기 MBTI를 비밀로 선택 →
// 나머지가 E/I부터 한 축씩 맞힘 → 축별로 공개(맞은/틀린 사람) → 최종 결과.
// 모두가 4축 다 맞히면 질문자 벌칙(너무 뻔함), 하나라도 틀린 사람은 그 사람 벌칙.
import { useState } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

const AXES = [
  { key: 'EI', desc: '에너지', a: 'E', b: 'I', an: 'E · 외향', bn: 'I · 내향' },
  { key: 'NS', desc: '인식', a: 'N', b: 'S', an: 'N · 직관', bn: 'S · 감각' },
  { key: 'TF', desc: '판단', a: 'T', b: 'F', an: 'T · 사고', bn: 'F · 감정' },
  { key: 'PJ', desc: '생활', a: 'P', b: 'J', an: 'P · 인식', bn: 'J · 판단' },
]
const mbtiOf = (ans) => (ans ? AXES.map((x) => ans[x.key] || '?').join('') : '????')

// 두 갈래 선택 버튼 (a / b)
function AxisButtons({ ax, value, onPick, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[['a', 'an', 'var(--c-sky)'], ['b', 'bn', 'var(--c-pink)']].map(([slot, labelKey, color]) => {
        const v = ax[slot]
        const on = value === v
        return (
          <button
            key={v}
            onClick={() => !disabled && onPick(v)}
            disabled={disabled}
            className="clay-btn py-4 font-display text-lg disabled:opacity-60"
            style={on ? { background: color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {ax[labelKey]}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, players }) {
  const subjectId = useValue(`${base}/subjectId`)
  const answer = useValue(`${base}/answer`)
  const step = useValue(`${base}/step`) || 0
  const shown = useValue(`${base}/shown`)
  const guessRaw = useValue(`${base}/guess`)

  const subject = players.find((p) => p.id === subjectId)
  const guessers = players.filter((p) => p.id !== subjectId)
  const resetBtn = <button className="mt-4 text-xs underline block mx-auto" style={{ color: 'var(--ink-soft)' }} onClick={() => dbSet(base, null)}>↩ 질문자 다시 고르기</button>

  // 1) 질문자 지목
  if (!subjectId) {
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-3">🧠 MBTI 맞히기 · 질문자를 고르세요</p>
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <Button key={p.id} variant="ghost" onClick={() => dbSet(base, { subjectId: p.id, answer: null, step: 0, shown: false, guess: null })}>{p.nickname}</Button>
          ))}
          {!players.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
        </div>
      </div>
    )
  }

  // 2) 질문자가 자기 MBTI 선택 중
  if (!answer) {
    return (
      <div className="text-center">
        <div style={{ color: 'var(--ink-soft)' }}>질문자</div>
        <div className="font-display text-3xl">{subject?.nickname}</div>
        <p className="mt-4 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>🤫 자기 MBTI 고르는 중… 다들 예상해보세요!</p>
        {resetBtn}
      </div>
    )
  }

  // 4) 최종 결과
  if (step >= 4) {
    const scores = guessers.map((p) => {
      let c = 0
      AXES.forEach((ax, i) => { if ((guessRaw?.[i] || {})[p.id] === answer[ax.key]) c++ })
      return { p, c }
    }).sort((x, y) => y.c - x.c)
    const perfect = scores.filter((s) => s.c === 4)
    const wrongs = scores.filter((s) => s.c < 4)
    const allPerfect = guessers.length > 0 && perfect.length === guessers.length

    return (
      <div className="text-center">
        <div style={{ color: 'var(--ink-soft)' }}>{subject?.nickname} 님의 MBTI</div>
        <div className="font-display text-6xl mt-1 tracking-widest animate-pop">{mbtiOf(answer)}</div>
        {allPerfect ? (
          <div className="mt-3 font-display text-2xl" style={{ color: 'var(--c-coral)' }}>🍺 전원 정답! 질문자 <b>{subject?.nickname}</b> 벌칙 (너무 뻔함)</div>
        ) : (
          <div className="mt-3 font-bold" style={{ color: 'var(--c-coral)' }}>🍺 벌칙(하나라도 틀림): {wrongs.map((s) => s.p.nickname).join(', ') || '없음'}</div>
        )}
        <div className="mt-1" style={{ color: 'var(--c-mint)' }}>🎯 완벽 예측: {perfect.map((s) => s.p.nickname).join(', ') || '없음'}</div>
        <div className="mt-4 max-w-sm mx-auto space-y-1.5 text-left">
          {scores.map((s) => (
            <div key={s.p.id} className="clay-inset px-3 py-2 flex items-center justify-between">
              <span className="font-bold">{s.p.nickname}</span>
              <span className="font-display" style={{ color: s.c === 4 ? 'var(--c-mint)' : s.c === 0 ? 'var(--c-coral)' : 'var(--ink)' }}>{s.c}/4 {s.c === 4 ? '🎯' : ''}</span>
            </div>
          ))}
        </div>
        {resetBtn}
      </div>
    )
  }

  // 3) 축별 맞히기
  const ax = AXES[step]
  const guesses = guessRaw?.[step] || {}
  const truth = answer[ax.key]
  const rows = guessers.map((p) => ({ p, g: guesses[p.id], correct: guesses[p.id] === truth }))
  const answered = rows.filter((r) => r.g).length
  const aCount = rows.filter((r) => r.g === ax.a).length
  const bCount = rows.filter((r) => r.g === ax.b).length
  const allCorrect = guessers.length > 0 && rows.every((r) => r.correct)
  const last = step === 3

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>질문자 <b style={{ color: 'var(--ink)' }}>{subject?.nickname}</b> · 축 {step + 1}/4 · {ax.desc}</div>
      <div className="font-display text-3xl mt-1">{ax.an} <span style={{ color: 'var(--ink-soft)' }}>vs</span> {ax.bn}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{answered}/{guessers.length} 응답 · {ax.a} {aCount} · {ax.b} {bCount}</div>

      {!shown ? (
        <Button className="mt-4" variant="warn" onClick={() => dbSet(`${base}/shown`, true)}>👁 이 축 공개</Button>
      ) : (
        <div className="mt-4">
          <div className="font-display text-2xl">정답: <span style={{ color: 'var(--c-mint)' }}>{truth === ax.a ? ax.an : ax.bn}</span></div>
          {allCorrect && <div className="mt-1 font-bold" style={{ color: 'var(--c-coral)' }}>💯 전부 정답! (질문자 벌칙 후보)</div>}
          <div className="mt-3 grid grid-cols-2 gap-3 max-w-lg mx-auto text-left">
            <div className="clay-inset p-2">
              <div className="text-sm font-bold" style={{ color: 'var(--c-mint)' }}>⭕ 맞음</div>
              <div className="text-sm mt-1">{rows.filter((r) => r.correct).map((r) => r.p.nickname).join(', ') || '없음'}</div>
            </div>
            <div className="clay-inset p-2">
              <div className="text-sm font-bold" style={{ color: 'var(--c-coral)' }}>❌ 틀림 · 벌칙</div>
              <div className="text-sm mt-1">{rows.filter((r) => r.g && !r.correct).map((r) => r.p.nickname).join(', ') || '없음'}</div>
            </div>
          </div>
          <Button className="mt-4" variant="primary" onClick={() => dbUpdate(base, { step: step + 1, shown: false })}>{last ? '🏁 최종 결과 ▶' : '다음 축 ▶'}</Button>
        </div>
      )}
      {resetBtn}
    </div>
  )
}

/* ═══════════════ 참가자 ═══════════════ */
function SubjectSetup({ base }) {
  const [draft, setDraft] = useState({})
  const set = (key, v) => setDraft((d) => ({ ...d, [key]: v }))
  const ready = AXES.every((ax) => draft[ax.key])
  return (
    <div className="text-center">
      <p className="font-display text-lg">🙈 내 MBTI 고르기</p>
      <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>솔직하게! 다들 이걸 맞힐 거예요</p>
      <div className="space-y-3">
        {AXES.map((ax) => (
          <div key={ax.key}>
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>{ax.desc}</div>
            <AxisButtons ax={ax} value={draft[ax.key]} onPick={(v) => set(ax.key, v)} />
          </div>
        ))}
      </div>
      <Button className="mt-4 w-full" onClick={() => ready && dbSet(`${base}/answer`, draft)} disabled={!ready}>
        {ready ? `제출 (${AXES.map((x) => draft[x.key]).join('')})` : '4개 다 골라주세요'}
      </Button>
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const subjectId = useValue(`${base}/subjectId`)
  const answer = useValue(`${base}/answer`)
  const step = useValue(`${base}/step`) || 0
  const shown = useValue(`${base}/shown`)
  const myGuess = useValue(`${base}/guess/${step}/${me.id}`)
  const guessRaw = useValue(`${base}/guess`)

  const subject = players.find((p) => p.id === subjectId)
  const amSubject = subjectId === me.id

  if (!subjectId) {
    return <div className="text-center py-12"><div className="text-5xl">🧠</div><p className="mt-3 font-display text-xl">호스트가 질문자를 고르는 중…</p></div>
  }

  // 질문자 본인
  if (amSubject) {
    if (!answer) return <SubjectSetup base={base} />
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl">제출 완료! 다들 맞히는 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>내 MBTI: {mbtiOf(answer)}</p>
      </div>
    )
  }

  // 맞히는 사람
  if (!answer) {
    return <div className="text-center py-12"><div className="text-5xl">🙈</div><p className="mt-3 font-display text-xl">{subject?.nickname} 님이 MBTI 고르는 중…</p></div>
  }

  // 최종 결과 (내 성적)
  if (step >= 4) {
    let c = 0
    AXES.forEach((ax, i) => { if ((guessRaw?.[i] || {})[me.id] === answer[ax.key]) c++ })
    const perfect = c === 4
    return (
      <div className="text-center py-8">
        <div className="text-6xl">{perfect ? '🎯' : c === 0 ? '💀' : '🍺'}</div>
        <p className="mt-3 font-display text-2xl">{subject?.nickname} = {mbtiOf(answer)}</p>
        <p className="mt-2 font-display text-xl" style={{ color: perfect ? 'var(--c-mint)' : 'var(--c-coral)' }}>내 정답 {c}/4 {perfect ? '· 완벽!' : '· 벌칙 🍺'}</p>
      </div>
    )
  }

  // 현재 축 맞히기
  const ax = AXES[step]
  const truth = answer[ax.key]
  const correct = myGuess === truth
  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>축 {step + 1}/4 · {ax.desc}</div>
      <p className="font-display text-xl mt-1">{subject?.nickname} 님은?</p>
      <div className="mt-3">
        <AxisButtons ax={ax} value={myGuess} onPick={(v) => dbSet(`${base}/guess/${step}/${me.id}`, v)} disabled={shown} />
      </div>
      {shown ? (
        <p className="mt-3 font-display text-lg" style={{ color: correct ? 'var(--c-mint)' : 'var(--c-coral)' }}>
          정답: {truth} · {myGuess ? (correct ? '맞았어요! ⭕' : '틀렸어요 ❌ 벌칙 🍺') : '미응답 ❌'}
        </p>
      ) : (
        myGuess && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>선택: {myGuess} · 공개 전까지 변경 가능</p>
      )}
    </div>
  )
}

export default {
  id: 'mbti',
  name: 'MBTI 맞히기',
  emoji: '🧠',
  tagline: '질문자 MBTI를 한 축씩 예측',
  genres: ['mind'],
  traits: ['party'],
  controls: { mode: 'self' }, // 지목·선택·공개·결과를 게임이 자체 관리
  HostView,
  PlayerView,
}
