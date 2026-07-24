// 순위 싱크 — 한 명(주인공)을 정하고, 그 사람이 주제의 항목을 진짜 순위대로 매긴다.
// 나머지는 '주인공이 어떻게 매겼을지'를 맞힌다. 같은 항목을 같은 순위에 놓을수록 정답(위치 일치 수 = 점수).
// 주제: 프리셋(5개 중 랜덤 N개) 또는 자유 주제(직접 입력) · 선택지 수 3/4/5(기본 4).
// 주인공의 순위는 공용 화면·다른 사람 폰엔 비밀 · 공개 때만 발표. (얼마나 잘 아는가 게임)
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
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
const COUNTS = [3, 4, 5]
const DEFAULT_COUNT = 4

const rand = (n) => Math.floor(Math.random() * n)
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const parseItems = (txt) => {
  const seen = new Set(), out = []
  ;(txt || '').split(/[\n,·]/).map((s) => s.trim()).filter(Boolean).forEach((x) => { if (!seen.has(x)) { seen.add(x); out.push(x) } })
  return out.slice(0, 6)
}
// 두 순위 배열의 '같은 위치·같은 항목' 개수
const countMatch = (guess, truth) =>
  Array.isArray(guess) && Array.isArray(truth) ? truth.filter((_, i) => guess[i] === truth[i]).length : 0

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}
function leaderboard(ranksRaw, targetId, players) {
  const truth = ranksRaw?.[targetId]
  if (!Array.isArray(truth)) return []
  return players
    .filter((p) => p.id !== targetId && Array.isArray(ranksRaw?.[p.id]))
    .map((p) => ({ p, m: countMatch(ranksRaw[p.id], truth) }))
    .sort((a, b) => b.m - a.m)
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, meta, players }) {
  const topicTitle = useValue(`${base}/topicTitle`)
  const items = useValue(`${base}/items`)
  const targetId = useValue(`${base}/target`)
  const ranksRaw = useValue(`${base}/ranks`)
  const nameOf = useNameOf(players)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  const [count, setCount] = useState(DEFAULT_COUNT)
  const [sel, setSel] = useState(null) // { kind:'preset', i } | { kind:'custom' }
  const [customTitle, setCustomTitle] = useState('')
  const [customText, setCustomText] = useState('')

  const itemCount = items?.length || 0
  const targetRanks = ranksRaw?.[targetId]
  const targetDone = Array.isArray(targetRanks) && targetRanks.length === itemCount && itemCount > 0
  const guessers = players.filter((p) => p.id !== targetId)
  const guessedCount = guessers.filter((p) => Array.isArray(ranksRaw?.[p.id])).length
  const board = useMemo(() => leaderboard(ranksRaw, targetId, players), [ranksRaw, targetId, players])
  const best = board[0]?.m || 0

  const pickTarget = (pid) => dbUpdate(base, { target: pid })
  const writeTopic = (title, its) => dbUpdate(base, { topicTitle: title, items: its, ranks: null })
  const selectPreset = (i) => { setSel({ kind: 'preset', i }); writeTopic(TOPICS[i].t, shuffle(TOPICS[i].items).slice(0, count)) }
  const changeCount = (c) => { setCount(c); if (sel?.kind === 'preset') writeTopic(TOPICS[sel.i].t, shuffle(TOPICS[sel.i].items).slice(0, c)) }
  const applyCustom = () => {
    const its = parseItems(customText)
    if (its.length < 3) return alert('항목을 3개 이상 입력하세요. (쉼표 또는 줄바꿈으로 구분)')
    setSel({ kind: 'custom' })
    writeTopic(customTitle.trim() || '자유 주제', its)
  }

  // ── 설정: 주인공 + 주제 + 선택지 수 ──
  if (staged) {
    return (
      <div className="text-center">
        <div className="font-display text-xl">📊 순위 싱크</div>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>한 명(주인공)의 순위를 나머지가 맞히는 게임 · 잘 아는 만큼 맞힌다!</p>

        {/* ① 주인공 */}
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>① 주인공 고르기</div>
          <button onClick={() => players.length && pickTarget(players[rand(players.length)].id)} className="clay-btn px-4 py-1.5 text-sm font-display mb-2" style={{ background: 'var(--c-grape)', color: '#fff' }}>🎲 랜덤</button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {players.map((p) => (
              <button key={p.id} onClick={() => pickTarget(p.id)} className="clay-btn px-3 py-1.5 text-sm font-bold"
                style={targetId === p.id ? { background: 'var(--c-sky)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {p.nickname}
              </button>
            ))}
          </div>
        </div>

        {/* ② 선택지 수 */}
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>② 선택지 수 <span className="text-xs">(적을수록 쉬움 · 프리셋에 적용)</span></div>
          <div className="flex justify-center gap-2">
            {COUNTS.map((c) => (
              <button key={c} onClick={() => changeCount(c)} className="clay-btn px-4 py-2 font-display"
                style={count === c ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {c}개
              </button>
            ))}
          </div>
        </div>

        {/* ③ 주제 */}
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>③ 주제 (프리셋 또는 자유 입력)</div>
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {TOPICS.map((tp, i) => (
              <button key={i} onClick={() => selectPreset(i)} className="clay-btn px-3 py-2 text-sm font-bold"
                style={sel?.kind === 'preset' && sel.i === i ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {tp.t}
              </button>
            ))}
          </div>

          <div className="mt-3 clay-inset p-3 max-w-lg mx-auto text-left">
            <div className="text-sm font-bold mb-1">✏️ 자유 주제</div>
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="주제 이름 (예: 우리 팀 인기 메뉴)" className="clay-inset w-full px-3 py-2 text-sm mb-2" />
            <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={2} placeholder="항목을 쉼표나 줄바꿈으로 3~6개 (예: 치킨, 피자, 곱창, 마라탕)" className="clay-inset w-full px-3 py-2 text-sm resize-none" />
            <Button className="w-full mt-2 text-sm py-2" onClick={applyCustom}>이 자유 주제로 설정</Button>
          </div>
        </div>

        {/* 현재 설정 요약 */}
        {items?.length ? (
          <div className="mt-4 clay-inset px-3 py-2 max-w-lg mx-auto text-sm">
            <b>{topicTitle}</b> · {items.length}개: {items.join(' · ')}
            {targetId ? <div className="mt-1" style={{ color: 'var(--c-sky)' }}>🎯 주인공: {nameOf(targetId)} · ‘시작’ 누르면 주인공이 순위를 정하고 나머지가 맞혀요</div>
                      : <div className="mt-1" style={{ color: 'var(--c-coral)' }}>주인공을 골라주세요</div>}
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>주제를 골라주세요 (프리셋 또는 자유 주제)</p>
        )}
      </div>
    )
  }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>🎯 주인공 <b style={{ color: 'var(--ink)' }}>{nameOf(targetId)}</b> · 주제 <b style={{ color: 'var(--ink)' }}>{topicTitle}</b> ({itemCount}개)</div>

      {reveal ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-sm mb-1" style={{ color: 'var(--c-sky)' }}>{nameOf(targetId)}의 진짜 순위</div>
            <div className="flex flex-wrap justify-center gap-2">
              {(targetRanks || []).map((it, i) => (
                <span key={i} className="clay-inset px-3 py-1.5 font-display" style={{ background: 'var(--c-sky)', color: '#fff' }}>{i + 1}. {items?.[it]}</span>
              ))}
              {!targetDone && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>주인공이 순위를 안 정했어요.</span>}
            </div>
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>🏆 얼마나 맞혔나 (위치 일치 / {itemCount})</div>
            {board.map(({ p, m }, i) => (
              <div key={p.id} className="clay-inset px-3 py-2 flex items-center gap-2" style={m === best && best > 0 ? { outline: '2px solid var(--c-mint)' } : {}}>
                <span className="font-display w-6">{i + 1}</span>
                <span className="flex-1 text-left font-bold">{p.nickname}</span>
                <span className="font-display text-lg">{m}개</span>
                {m === best && best > 0 && <span>🥇</span>}
              </div>
            ))}
            {!board.length && <p className="py-3 text-sm" style={{ color: 'var(--ink-soft)' }}>맞힌 사람이 없어요.</p>}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {!targetDone ? (
            <>
              <div className="text-4xl">🤫</div>
              <p className="mt-2 font-display text-lg">{nameOf(targetId)} 님이 순위 정하는 중…</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>정해지면 나머지가 맞혀요 (순위는 비밀)</p>
            </>
          ) : (
            <>
              <div className="text-4xl">🔮</div>
              <p className="mt-2 font-display text-lg">{nameOf(targetId)}의 순위를 맞히는 중… {guessedCount}/{guessers.length}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>👁 ‘공개’ 누르면 정답·순위표 발표</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════ 참가자 ═══════════════ */
function PlayerView({ base, meta, players, me }) {
  const topicTitle = useValue(`${base}/topicTitle`)
  const items = useValue(`${base}/items`)
  const targetId = useValue(`${base}/target`)
  const mine = useValue(`${base}/ranks/${me.id}`)
  const ranksRaw = useValue(`${base}/ranks`)
  const nameOf = useNameOf(players)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const amTarget = targetId === me.id
  const [seq, setSeq] = useState(Array.isArray(mine) ? mine : [])

  // 새 라운드(주제/주인공 변경) 시 내 순위 초기화
  useEffect(() => { setSeq(Array.isArray(mine) ? mine : []) }, [topicTitle, targetId, items?.length]) // eslint-disable-line

  if (!items?.length || !targetId) {
    return <div className="text-center py-12"><div className="text-5xl">📊</div><p className="mt-3 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>진행자가 주인공·주제를 정하는 중…</p></div>
  }

  const truth = ranksRaw?.[targetId]

  // ── 공개 ──
  if (reveal) {
    if (amTarget) {
      const board = leaderboard(ranksRaw, targetId, players)
      const bestP = board[0]
      return (
        <div className="text-center">
          <p className="font-display text-xl">🎯 내 순위 공개!</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {(mine || []).map((it, i) => (
              <span key={i} className="clay-inset px-3 py-1.5 font-display" style={{ background: 'var(--c-sky)', color: '#fff' }}>{i + 1}. {items[it]}</span>
            ))}
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {bestP && bestP.m > 0 ? <>나를 제일 잘 아는 사람: <b style={{ color: 'var(--c-mint)' }}>{bestP.p.nickname}</b> ({bestP.m}개 일치)</> : '아무도 못 맞혔어요 😎'}
          </p>
        </div>
      )
    }
    const m = countMatch(mine, truth)
    return (
      <div className="text-center">
        <div className="clay p-5" style={{ background: m > 0 ? 'var(--c-mint)' : 'var(--surface-2)', color: m > 0 ? '#fff' : 'var(--ink)' }}>
          <div className="text-sm opacity-90">{nameOf(targetId)}의 순위 중</div>
          <div className="font-display text-5xl mt-1">{m}/{items.length}</div>
          <div className="mt-1">위치까지 맞힘</div>
        </div>
        <div className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{nameOf(targetId)}의 진짜 순위</div>
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {(truth || []).map((it, i) => {
            const hit = (mine || [])[i] === it
            return <span key={i} className="clay-inset px-3 py-1.5 font-display" style={hit ? { background: 'var(--c-mint)', color: '#fff' } : {}}>{i + 1}. {items[it]}</span>
          })}
        </div>
      </div>
    )
  }

  // ── 순위 매기기 (주인공=진짜 / 나머지=추측) ──
  const rankOf = (i) => { const idx = seq.indexOf(i); return idx >= 0 ? idx + 1 : null }
  const toggle = (i) => {
    if (!open) return
    let next
    if (seq.includes(i)) next = seq.filter((x) => x !== i)
    else if (seq.length < items.length) next = [...seq, i]
    else return
    setSeq(next)
    dbSet(`${base}/ranks/${me.id}`, next)
  }
  const accent = amTarget ? 'var(--c-sky)' : 'var(--c-grape)'

  return (
    <div className="text-center">
      {amTarget ? (
        <>
          <p className="font-display text-xl" style={{ color: 'var(--c-sky)' }}>🎯 당신이 주인공!</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>「{topicTitle}」 <b>당신의 진짜 순위</b>를 정하세요 · 다른 사람이 이걸 맞혀요 🤫</p>
        </>
      ) : (
        <>
          <p className="font-display text-xl">🔮 {nameOf(targetId)}의 순위 맞히기</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>「{topicTitle}」 {nameOf(targetId)} 님이 어떻게 매겼을지 예측! (탭 순서 = 1위→{items.length}위)</p>
        </>
      )}

      <div className="mt-4 space-y-2 max-w-sm mx-auto">
        {items.map((it, i) => {
          const r = rankOf(i)
          return (
            <button key={i} onClick={() => toggle(i)} disabled={!open}
              className="clay-btn w-full px-4 py-3 flex items-center justify-between disabled:opacity-90"
              style={r ? { background: accent, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <span className="font-display text-lg">{it}</span>
              <span className="font-display text-xl w-8 h-8 rounded-full flex items-center justify-center" style={{ background: r ? 'rgba(255,255,255,0.25)' : 'var(--surface)' }}>{r || '·'}</span>
            </button>
          )
        })}
      </div>
      {open && seq.length > 0 && (
        <button onClick={() => { setSeq([]); dbSet(`${base}/ranks/${me.id}`, []) }} className="mt-3 text-sm underline" style={{ color: 'var(--ink-soft)' }}>다시 매기기</button>
      )}
      {seq.length === items.length && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>완료! 공개 전까지 수정 가능</p>}
    </div>
  )
}

export default {
  id: 'ranksync',
  name: '순위 싱크',
  emoji: '📊',
  tagline: '한 명을 고르고 그 사람의 순위 맞히기',
  genres: ['telepathy', 'party'],
  traits: [],
  HostView,
  PlayerView,
}
