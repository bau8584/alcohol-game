// 진실 혹은 거짓 — 익명으로 한 문장씩(진실이든 거짓이든) 던지고, 전원이 OX로 연달아 맞히기.
//  · 작성 부담 최소: 한 명당 딱 한 문장 + 진실/거짓 체크.
//  · 익명 수집 → 호스트가 하나씩 공개, 전원 동시 OX 투표(자기 문장은 제외).
//  · 공개 때 작성자 정체가 까발려지는 게 하이라이트.
//  · 점수: 맞히면 +1, 내 문장에 과반이 속으면 작성자 +2. "한 번 더"는 점수 유지.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbRemove, dbTransaction, toList } from '../lib/db'
import { Button } from '../components/ui'

// Fisher-Yates 셔플 (순서 익명화)
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const HINTS = [
  '나 사실 발가락이 6개야',
  '연예인이랑 사진 찍어본 적 있어',
  '무면허로 운전해본 적 있어',
  '번지점프 해봤어',
  '학교 다닐 때 별명이 있었어',
]

// 작성자 공개 방식 옵션 (진행자 선택)
const AUTHOR_MODES = [
  { id: 'open', label: '🔓 공개 때', desc: '블라인드 투표 → 공개 순간 "작성자는 OO!" 반전 (추천)' },
  { id: 'always', label: '👀 항상 표시', desc: '투표 중에도 작성자가 보여요 (수다·놀림 위주)' },
  { id: 'end', label: '🙈 결과에서만', desc: '끝까지 숨기고 마지막에 몰아보기 (최대 미스터리)' },
]
function AuthorModePicker({ mode, onPick }) {
  const cur = AUTHOR_MODES.find((m) => m.id === mode) || AUTHOR_MODES[0]
  return (
    <div className="max-w-sm mx-auto mt-4 text-center">
      <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>작성자 공개 방식</div>
      <div className="flex gap-1.5 justify-center">
        {AUTHOR_MODES.map((m) => (
          <button key={m.id} onClick={() => onPick(m.id)} className="clay-btn px-3 py-2 text-sm font-display flex-1"
            style={mode === m.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{cur.desc}</div>
    </div>
  )
}

// 결과 몰아보기 — 모든 문장 → 작성자 → 진실/거짓
function Recap({ order, entriesRaw, byId }) {
  const ids = Array.isArray(order) ? order : []
  if (!ids.length) return null
  return (
    <div className="max-w-md mx-auto mt-5 text-left">
      <div className="text-sm mb-2 text-center" style={{ color: 'var(--ink-soft)' }}>📜 누가 뭘 썼나 몰아보기</div>
      <div className="space-y-1.5">
        {ids.map((id, i) => {
          const e = entriesRaw?.[id]
          if (!e) return null
          return (
            <div key={id} className="clay-inset px-3 py-2 flex items-center gap-2">
              <span className="font-display text-sm w-5 shrink-0" style={{ color: 'var(--ink-soft)' }}>{i + 1}</span>
              <span className="flex-1 text-sm">“{e.text}”</span>
              <span className="text-sm font-bold shrink-0">{byId[id]?.nickname || '?'}</span>
              <span className="text-sm shrink-0" style={{ color: e.truth ? 'var(--c-mint)' : 'var(--c-coral)' }}>{e.truth ? '⭕' : '🔴'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HostView({ base, players }) {
  const phase = useValue(`${base}/phase`) || 'write'
  const entriesRaw = useValue(`${base}/entry`)
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`) ?? 0
  const shown = useValue(`${base}/shown`)
  const scoreRaw = useValue(`${base}/score`)
  const authorMode = useValue(`${base}/authorMode`) || 'open' // open=공개때 · always=투표중에도 · end=결과에서만
  const peekRaw = useValue(`${base}/peek`)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  const submitted = players.filter((p) => entriesRaw?.[p.id]?.text)
  const orderArr = Array.isArray(order) ? order : []
  const curId = phase === 'quiz' ? orderArr[idx] : null
  const cur = curId ? entriesRaw?.[curId] : null
  const votesRaw = useValue(curId ? `${base}/vote/${curId}` : null)
  const votes = toList(votesRaw) // {id, value:boolean}

  // 집계: value(=투표) 가 boolean. entry.truth 와 같으면 정답.
  const yes = votes.filter((v) => v.value === true).length // 진실이라고 찍음
  const no = votes.filter((v) => v.value === false).length // 거짓이라고 찍음
  const votedIds = new Set(votes.map((v) => v.id))
  const voters = cur ? players.filter((p) => p.id !== curId) : []
  const notVoted = voters.filter((p) => !votedIds.has(p.id))
  const correctVoters = cur ? votes.filter((v) => v.value === cur.truth).map((v) => byId[v.id]?.nickname).filter(Boolean) : []
  const fooledVoters = cur ? votes.filter((v) => v.value !== cur.truth).map((v) => byId[v.id]?.nickname).filter(Boolean) : []
  const authorFooled = cur ? fooledVoters.length > voters.length / 2 && voters.length > 0 : false

  const scores = toList(scoreRaw).map((s) => ({ ...s, nickname: byId[s.id]?.nickname || '?', n: s.value || 0 })).sort((a, b) => b.n - a.n)

  // 작성자 표시 여부: 진행자가 이번 문장 몰래보기(peek) 눌렀거나 · 항상보기 모드 · (공개됐고 결과전용 모드가 아님)
  const authorVisible = !!peekRaw?.[curId] || authorMode === 'always' || (shown && authorMode !== 'end')

  const startQuiz = () => {
    const ids = shuffle(submitted.map((p) => p.id))
    dbUpdate(base, { order: ids, idx: 0, shown: false, phase: 'quiz', peek: null })
  }
  const setMode = (m) => dbSet(`${base}/authorMode`, m)
  const peekAuthor = () => curId && dbSet(`${base}/peek/${curId}`, true)

  // 공개: 점수 정산 (한 번만) 후 shown=true
  const reveal = () => {
    if (!cur) return
    // 맞힌 사람 +1
    votes.forEach((v) => {
      if (v.value === cur.truth) dbTransaction(`${base}/score/${v.id}`, (n) => (n || 0) + 1)
    })
    // 작성자: 과반 속였으면 +2
    if (authorFooled) dbTransaction(`${base}/score/${curId}`, (n) => (n || 0) + 2)
    dbSet(`${base}/shown`, true)
  }

  const next = () => {
    if (idx + 1 >= orderArr.length) dbSet(`${base}/phase`, 'done')
    else dbUpdate(base, { idx: idx + 1, shown: false })
  }

  // 한 번 더: 문장/순서/투표만 초기화, 점수 유지
  const again = () => {
    dbRemove(`${base}/entry`)
    dbRemove(`${base}/vote`)
    dbRemove(`${base}/order`)
    dbRemove(`${base}/peek`)
    dbUpdate(base, { idx: 0, shown: false, phase: 'write' })
  }

  // 완전 리셋 (점수까지)
  const resetAll = () => { dbRemove(`${base}/score`); again() }

  if (phase === 'write') {
    return (
      <div className="text-center">
        <p className="font-display text-lg mb-1">✍️ 익명으로 한 문장씩 걷는 중</p>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>진실이든 거짓이든 한 문장 + 진실/거짓 체크<br />→ 다 모이면 <b>한 문장씩</b> 공개해서 전원이 OX로 맞혀요</p>
        <div className="text-2xl font-display mb-3">{submitted.length} / {players.length} 제출</div>
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {players.map((p) => (
            <span key={p.id} className="clay-inset px-3 py-1.5 text-sm">{p.nickname}{entriesRaw?.[p.id]?.text ? ' ✓' : ' …'}</span>
          ))}
        </div>
        <AuthorModePicker mode={authorMode} onPick={setMode} />
        <Button className="w-full max-w-sm mt-3" onClick={startQuiz} disabled={submitted.length < 2}>
          {submitted.length < 2 ? '2명 이상 제출해야 시작' : `퀴즈 시작 (${submitted.length}문장)`}
        </Button>
        {scores.some((s) => s.n) && (
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>누적: {scores.slice(0, 3).map((s) => `${s.nickname} ${s.n}`).join(' · ')}</p>
        )}
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="text-center">
        <p className="font-display text-2xl mb-3">🏆 결과</p>
        <div className="max-w-sm mx-auto space-y-1.5 mb-4">
          {scores.map((s, i) => (
            <div key={s.id} className="clay px-4 py-2.5 flex items-center justify-between" style={i === 0 ? { background: 'var(--c-grape)', color: '#fff' } : {}}>
              <span className="font-display">{['🥇', '🥈', '🥉'][i] || `${i + 1}.`} {s.nickname}</span>
              <span className="font-display">{s.n}점</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm mx-auto">
          <Button className="flex-1" onClick={again}>한 번 더 (점수 유지)</Button>
          <Button variant="ghost" onClick={resetAll}>처음부터</Button>
        </div>
        <Recap order={order} entriesRaw={entriesRaw} byId={byId} />
      </div>
    )
  }

  // quiz
  return (
    <div className="text-center">
      <div className="clay-inset inline-block px-4 py-1 mb-2 font-display" style={{ color: 'var(--c-grape)' }}>
        🃏 문장 {idx + 1} / {orderArr.length} · 한 문장씩 맞혀요
      </div>
      <div className="clay px-5 py-6 max-w-md mx-auto mb-3">
        <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>지금 이 문장은…</div>
        <div className="font-display text-2xl leading-snug">“{cur?.text}”</div>
      </div>

      {!shown ? (
        <>
          <div className="text-lg font-display mb-2">⭕ 진실일까 🔴 거짓일까?</div>
          {/* 작성자 미리 표시(항상보기 모드/몰래보기) or 몰래보기 버튼 */}
          {authorVisible ? (
            <div className="clay-inset inline-block px-4 py-1.5 mb-2 text-sm">✍️ 작성자: <b>{byId[curId]?.nickname}</b></div>
          ) : (
            <div className="mb-2"><button onClick={peekAuthor} className="clay-btn px-4 py-1.5 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>👤 작성자 미리 공개</button></div>
          )}
          <div className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>{votedIds.size} / {voters.length} 선택 · 표는 공개 때 🔒</div>
          {notVoted.length > 0 && (
            <div className="mb-3">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>아직 안 고른 사람 ({notVoted.length})</div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {notVoted.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname}</span>))}
              </div>
            </div>
          )}
          <Button variant="warn" className="w-full max-w-sm" onClick={reveal}>정답 공개</Button>
        </>
      ) : (
        <div className="max-w-md mx-auto">
          <div className="font-display text-3xl mb-2" style={{ color: cur?.truth ? 'var(--c-mint)' : 'var(--c-coral)' }}>
            → {cur?.truth ? '⭕ 진실!' : '🔴 거짓!'}
          </div>
          {authorVisible
            ? <div className="clay px-4 py-2 mb-2">작성자는… <b className="font-display text-lg">{byId[curId]?.nickname} 😎</b></div>
            : <div className="clay px-4 py-2 mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>🙈 작성자는 결과에서 몰아봐요</div>}
          <div className="text-sm mb-1">⭕ 진실 {yes}표 · 🔴 거짓 {no}표</div>
          {authorFooled && <div className="font-display" style={{ color: 'var(--c-grape)' }}>👏 과반을 속였다! {byId[curId]?.nickname} +2점</div>}
          <p className="text-sm mt-1" style={{ color: 'var(--c-mint)' }}>맞힌 사람 (+1): {correctVoters.join(', ') || '없음'}</p>
          <p className="text-sm" style={{ color: 'var(--c-coral)' }}>속은 사람 🍺: {fooledVoters.join(', ') || '없음'}</p>
          <Button className="w-full mt-3" onClick={next}>{idx + 1 >= orderArr.length ? '결과 보기' : '다음 문장 →'}</Button>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, players, me }) {
  const phase = useValue(`${base}/phase`) || 'write'
  const mine = useValue(`${base}/entry/${me.id}`)
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`) ?? 0
  const shown = useValue(`${base}/shown`)
  const entriesRaw = useValue(`${base}/entry`)
  const authorMode = useValue(`${base}/authorMode`) || 'open'
  const [text, setText] = useState('')
  const [truth, setTruth] = useState(null) // true=진실, false=거짓

  const orderArr = Array.isArray(order) ? order : []
  const curId = phase === 'quiz' ? orderArr[idx] : null
  const cur = useValue(curId ? `${base}/entry/${curId}` : null)
  const myVote = useValue(curId && curId !== me.id ? `${base}/vote/${curId}/${me.id}` : null)
  const peek = useValue(curId ? `${base}/peek/${curId}` : null)
  const hint = useMemo(() => HINTS[Math.floor(Math.random() * HINTS.length)], [])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const authorVisible = !!peek || authorMode === 'always' || (shown && authorMode !== 'end')
  const authorName = curId ? byId[curId]?.nickname : null

  // 작성 단계
  if (phase === 'write') {
    if (mine?.text) return <p className="text-center py-10 font-display text-lg">제출 완료! 다들 쓰는 중… 🤫</p>
    const submit = () => {
      if (!text.trim() || truth === null) return
      dbSet(`${base}/entry/${me.id}`, { text: text.trim(), truth })
    }
    return (
      <div>
        <p className="text-center font-display text-lg mb-1">한 문장 던지기</p>
        <p className="text-center text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>진짜 있었던 일이든, 완전 지어낸 뻥이든 OK</p>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={hint} maxLength={60}
          className="clay-inset w-full px-3 py-3 mb-3" />
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTruth(true)} className="clay-btn flex-1 py-3 font-display"
            style={truth === true ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>⭕ 진실</button>
          <button onClick={() => setTruth(false)} className="clay-btn flex-1 py-3 font-display"
            style={truth === false ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>🔴 거짓</button>
        </div>
        <Button className="w-full" onClick={submit} disabled={!text.trim() || truth === null}>제출</Button>
      </div>
    )
  }

  if (phase === 'done') return (
    <div className="text-center">
      <p className="py-6 font-display text-lg">🏆 결과 발표! 점수는 TV에서 🖥️</p>
      <Recap order={order} entriesRaw={entriesRaw} byId={byId} />
    </div>
  )

  // quiz 단계
  if (!curId) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>
  // 내 문장 차례
  if (curId === me.id) {
    return (
      <div className="text-center py-8">
        <p className="font-display text-lg mb-2">🤫 지금은 내 문장!</p>
        <div className="clay px-4 py-4 mb-2">“{cur?.text}”</div>
        {shown ? <p className="font-display" style={{ color: 'var(--c-grape)' }}>정체 공개됨 😎</p>
          : <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>다들 네 문장을 맞히는 중…</p>}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-sm font-display mb-1" style={{ color: 'var(--c-grape)' }}>🃏 문장 {idx + 1} / {orderArr.length} · 이 문장을 맞혀요</div>
      <div className="clay px-4 py-4 mb-2 font-display text-xl">“{cur?.text}”</div>
      {authorVisible && <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>✍️ 작성자: <b style={{ color: 'var(--ink)' }}>{authorName}</b></div>}
      {!shown ? (
        <div className="flex gap-2">
          <button onClick={() => dbSet(`${base}/vote/${curId}/${me.id}`, true)}
            className="clay-btn flex-1 py-6 font-display text-xl"
            style={myVote === true ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>⭕<br />진실</button>
          <button onClick={() => dbSet(`${base}/vote/${curId}/${me.id}`, false)}
            className="clay-btn flex-1 py-6 font-display text-xl"
            style={myVote === false ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>🔴<br />거짓</button>
        </div>
      ) : (
        <div>
          <div className="font-display text-2xl mb-2" style={{ color: cur?.truth ? 'var(--c-mint)' : 'var(--c-coral)' }}>
            → {cur?.truth ? '⭕ 진실!' : '🔴 거짓!'}
          </div>
          {myVote === null ? <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>미투표</p>
            : myVote === cur?.truth
              ? <p className="font-display" style={{ color: 'var(--c-mint)' }}>정답! +1점 🎉</p>
              : <p className="font-display" style={{ color: 'var(--c-coral)' }}>속았다! 벌칙 🍺</p>}
        </div>
      )}
    </div>
  )
}

export default {
  id: 'oxtruth',
  name: '진실 혹은 거짓',
  emoji: '🤥',
  tagline: '익명 한 문장 · 전원 OX로 진실/거짓 맞히기',
  genres: ['mind', 'party'],
  traits: ['solo', 'anon'],
  controls: { prompt: false, reveal: false },
  HostView,
  PlayerView,
}
