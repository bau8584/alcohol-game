// 투 트루스 — 진실2·거짓1 쓰고 거짓 찾기.
//  · 카테고리(주제)를 골라 작성 부담을 줄임 (힌트 placeholder 제공).
//  · 모드: 👥 모두 작성(전원이 미리 씀) / 🎯 지목 작성(호스트가 고른 사람만 그때 씀).
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList } from '../lib/db'
import { Button } from '../components/ui'

// 카테고리별 힌트(placeholder) — 이 주제로 진실2·거짓1을 쓰게 유도
const CATEGORIES = [
  { key: 'free', label: '자유', emoji: '🎲', hints: ['나에 대한 문장 1', '나에 대한 문장 2', '나에 대한 문장 3'] },
  { key: 'hobby', label: '취미·특기', emoji: '🎨', hints: ['다룰 줄 아는 악기/운동', '숨은 특기', '취미로 모으는 것'] },
  { key: 'travel', label: '여행·경험', emoji: '✈️', hints: ['가본 나라/도시', '아찔했던 경험', '해본 이색 알바'] },
  { key: 'love', label: '연애·썸', emoji: '💘', hints: ['첫사랑/연애 이야기', '이상형', '사귄 사람 수'] },
  { key: 'school', label: '학창시절', emoji: '🏫', hints: ['학창시절 별명', '동아리/사고 친 일', '성적/등수'] },
  { key: 'food', label: '음식·먹부림', emoji: '🍜', hints: ['못 먹는 음식', '먹방 최고 기록', '요리 실력'] },
  { key: 'dark', label: '흑역사', emoji: '🙈', hints: ['이불킥 사건', '민망한 실수', '오글거리는 과거'] },
  { key: 'adult', label: '19금', emoji: '🔞', hints: ['은밀한 경험', '연애 스킨십 비밀', '아찔했던 순간'] },
]
const catByKey = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[0]

function HostView({ base, meta, players }) {
  const mode = useValue(`${base}/mode`) || 'everyone'
  const category = useValue(`${base}/category`) || 'free'
  const entriesRaw = useValue(`${base}/entry`)
  const current = useValue(`${base}/current`)
  const shownLie = useValue(`${base}/shownLie`)
  const votesRaw = useValue(current ? `${base}/vote/${current}` : null)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  const submitted = players.filter((p) => entriesRaw?.[p.id]?.items)
  const cur = current ? entriesRaw?.[current] : null
  const pickList = mode === 'selected' ? players : submitted

  const feature = (pid) => dbUpdate(base, { current: pid, shownLie: false })
  const votes = toList(votesRaw)
  const tally = [0, 0, 0]
  const votedIds = new Set()
  votes.forEach((v) => { if (v.value >= 0 && v.value < 3) { tally[v.value]++; votedIds.add(v.id) } })
  const correctVoters = cur ? votes.filter((v) => v.value === cur.lie).map((v) => byId[v.id]?.nickname).filter(Boolean) : []
  // 현재 발표자 본인은 투표 대상 아님 → 그 외 참가자 중 아직 안 고른 사람
  const notVoted = cur ? players.filter((p) => p.id !== current && !votedIds.has(p.id)) : []

  return (
    <div className="text-center">
      {/* 모드 */}
      <div className="flex justify-center gap-2 mb-2">
        {[['everyone', '👥 모두 작성'], ['selected', '🎯 지목 작성']].map(([m, l]) => (
          <button key={m} onClick={() => dbSet(`${base}/mode`, m)} className="clay-btn px-4 py-1.5 text-sm font-bold" style={mode === m ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{l}</button>
        ))}
      </div>
      {/* 카테고리 */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {CATEGORIES.filter((c) => meta.adultEnabled || c.key !== 'adult').map((c) => (
          <button key={c.key} onClick={() => dbSet(`${base}/category`, c.key)} className="clay-btn px-2.5 py-1 text-sm" style={category === c.key ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{c.emoji} {c.label}</button>
        ))}
      </div>

      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        {mode === 'everyone' ? `주제 ${catByKey(category).label} · ${submitted.length}/${players.length} 제출` : `주제 ${catByKey(category).label} · 아래에서 작성할 사람을 지목`}
      </div>

      {/* 지목 리스트 */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {pickList.map((p) => {
          const done = !!entriesRaw?.[p.id]?.items
          return (
            <button key={p.id} onClick={() => feature(p.id)} className="clay-btn px-3 py-1.5 text-sm font-display" style={current === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              {p.nickname}{mode === 'selected' ? (done ? ' ✓' : ' ✍️') : ''}
            </button>
          )
        })}
        {!pickList.length && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{mode === 'selected' ? '참가자가 없어요.' : '제출을 기다리는 중…'}</p>}
      </div>

      {current && !cur && (
        <p className="mt-4 font-display text-lg" style={{ color: 'var(--ink-soft)' }}>✍️ {byId[current]?.nickname} 님이 작성 중…</p>
      )}

      {cur && (
        <div className="mt-4 max-w-md mx-auto space-y-2 text-left">
          <div className="font-display text-xl text-center mb-1">{byId[current]?.nickname} 의 3문장 — 거짓은?</div>
          {[0, 1, 2].map((i) => {
            const isLie = shownLie && i === cur.lie
            return (
              <div key={i} className="clay px-4 py-3 flex items-center justify-between gap-2" style={{ background: isLie ? 'var(--c-coral)' : 'var(--surface)', color: isLie ? '#fff' : 'var(--ink)' }}>
                <span><b className="mr-2">{i + 1}.</b>{cur.items[i]}</span>
                {shownLie && <span className="font-display shrink-0">{tally[i]}표{isLie ? ' · 거짓!' : ''}</span>}
              </div>
            )
          })}
          {!shownLie ? (
            <>
              <div className="text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{votedIds.size}/{votedIds.size + notVoted.length} 선택 · 표는 공개 때 🔒</div>
              {notVoted.length > 0 && (
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>아직 안 고른 사람 ({notVoted.length})</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {notVoted.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{byId[p.id]?.nickname || p.nickname}</span>))}
                  </div>
                </div>
              )}
              <Button variant="warn" className="w-full" onClick={() => dbSet(`${base}/shownLie`, true)}>정답(거짓) 공개</Button>
            </>
          ) : (
            <p className="text-center text-sm" style={{ color: 'var(--c-mint)' }}>맞힌 사람: {correctVoters.join(', ') || '없음'} 🎉 · 못 맞힌 사람 벌칙 🍺</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const mode = useValue(`${base}/mode`) || 'everyone'
  const category = useValue(`${base}/category`) || 'free'
  const mine = useValue(`${base}/entry/${me.id}`)
  const current = useValue(`${base}/current`)
  const shownLie = useValue(`${base}/shownLie`)
  const curEntry = useValue(current ? `${base}/entry/${current}` : null)
  const myVote = useValue(current ? `${base}/vote/${current}/${me.id}` : null)
  const [items, setItems] = useState(['', '', ''])
  const [lie, setLie] = useState(0)
  const cat = catByKey(category)

  // 지금 작성해야 하나? (모두 모드=항상 / 지목 모드=내가 지목됐을 때만)
  const shouldWrite = !mine?.items && (mode === 'everyone' || (mode === 'selected' && current === me.id))

  if (shouldWrite) {
    const submit = () => {
      if (items.some((t) => !t.trim())) return
      dbSet(`${base}/entry/${me.id}`, { items: items.map((t) => t.trim()), lie })
    }
    return (
      <div>
        <p className="text-center font-bold" style={{ color: 'var(--c-grape)' }}>{cat.emoji} 주제: {cat.label}</p>
        <p className="text-center mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>이 주제로 진실 2 + 거짓 1 (거짓에 체크)</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <button onClick={() => setLie(i)} className="w-10 h-10 rounded-full shrink-0 clay-btn text-xs font-bold" style={lie === i ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }} title="거짓으로 지정">{lie === i ? '거짓' : i + 1}</button>
            <input value={items[i]} onChange={(e) => setItems((a) => a.map((v, k) => (k === i ? e.target.value : v)))} placeholder={cat.hints[i]} className="clay-inset flex-1 min-w-0 px-3 py-2.5" />
          </div>
        ))}
        <Button className="w-full mt-1" onClick={submit} disabled={items.some((t) => !t.trim())}>제출</Button>
      </div>
    )
  }

  // 지목 모드: 아직 지목 안 됨
  if (mode === 'selected' && !current) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자가 작성할 사람을 지목하는 중… 🎯</p>
  // 모두 모드: 제출 완료 대기
  if (!current) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>제출 완료! 진행자가 한 명씩 공개합니다 🎭</p>
  // 내 차례 (내 문장 맞히는 중)
  if (current === me.id) return <p className="text-center font-display text-lg py-10">내 차례! 다들 내 거짓을 찾는 중… 🤫</p>
  // 지목된 사람이 아직 작성 중
  if (!curEntry?.items) return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>✍️ {players.find((p) => p.id === current)?.nickname} 님이 작성 중…</p>

  const items3 = curEntry.items
  return (
    <div className="text-center">
      <p className="font-display mb-2">{players.find((p) => p.id === current)?.nickname} 의 거짓은?</p>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => {
          const chosen = myVote === i
          const isLie = shownLie && i === curEntry.lie
          return (
            <button key={i} onClick={() => !shownLie && dbSet(`${base}/vote/${current}/${me.id}`, i)} disabled={shownLie}
              className="clay-btn w-full px-4 py-3 text-left"
              style={isLie ? { background: 'var(--c-coral)', color: '#fff' } : chosen ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <b className="mr-2">{i + 1}.</b>{items3[i]}{isLie ? ' · 거짓!' : chosen ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      {shownLie && <p className="mt-2 text-sm" style={{ color: myVote === curEntry.lie ? 'var(--c-mint)' : 'var(--c-coral)' }}>{myVote === curEntry.lie ? '정답! 🎉' : '틀렸어요 · 벌칙 🍺'}</p>}
    </div>
  )
}

export default {
  id: 'twotruths',
  name: '투 트루스',
  emoji: '🎭',
  tagline: '2진실 1거짓 · 주제별 · 모두/지목 작성',
  genres: ['mind', 'party'],
  traits: ['solo'],
  controls: { prompt: false, reveal: false },
  HostView,
  PlayerView,
}
