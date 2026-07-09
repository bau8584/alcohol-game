// 투 트루스 — 각자 문장 3개(진실2·거짓1) 입력. 호스트가 한 명씩 지목하면 나머지가 거짓을 투표,
// 호스트가 정답(거짓)을 공개한다. 소규모 아이스브레이커.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, toList } from '../lib/db'
import { Button } from '../components/ui'

function HostView({ base, meta, players }) {
  const entriesRaw = useValue(`${base}/entry`)
  const current = useValue(`${base}/current`)
  const shownLie = useValue(`${base}/shownLie`) // true면 거짓 공개
  const votesRaw = useValue(current ? `${base}/vote/${current}` : null)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const submitted = players.filter((p) => entriesRaw?.[p.id]?.items)
  const cur = current ? entriesRaw?.[current] : null

  const feature = (pid) => dbUpdate(base, { current: pid, shownLie: false })
  const votes = toList(votesRaw) // {id: voterId, value: idx}
  const tally = [0, 0, 0]
  votes.forEach((v) => { if (v.value >= 0 && v.value < 3) tally[v.value]++ })
  const correctVoters = cur ? votes.filter((v) => v.value === cur.lie).map((v) => byId[v.id]?.nickname).filter(Boolean) : []

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{submitted.length}/{players.length} 제출</div>

      {/* 지목할 사람 */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {submitted.map((p) => (
          <button key={p.id} onClick={() => feature(p.id)} className="clay-btn px-3 py-1.5 text-sm font-display" style={current === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>{p.nickname}</button>
        ))}
        {!submitted.length && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>제출을 기다리는 중…</p>}
      </div>

      {cur && (
        <div className="mt-4 max-w-md mx-auto space-y-2 text-left">
          <div className="font-display text-xl text-center mb-1">{byId[current]?.nickname} 의 3문장 — 거짓은?</div>
          {[0, 1, 2].map((i) => {
            const isLie = shownLie && i === cur.lie
            return (
              <div key={i} className="clay px-4 py-3 flex items-center justify-between gap-2" style={{ background: isLie ? 'var(--c-coral)' : 'var(--surface)', color: isLie ? '#fff' : 'var(--ink)' }}>
                <span><b className="mr-2">{i + 1}.</b>{cur.items[i]}</span>
                <span className="font-display shrink-0">{tally[i]}표{isLie ? ' · 거짓!' : ''}</span>
              </div>
            )
          })}
          {!shownLie ? (
            <Button variant="warn" className="w-full" onClick={() => dbSet(`${base}/shownLie`, true)}>정답(거짓) 공개</Button>
          ) : (
            <p className="text-center text-sm" style={{ color: 'var(--c-mint)' }}>맞힌 사람: {correctVoters.join(', ') || '없음'} 🎉</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const mine = useValue(`${base}/entry/${me.id}`)
  const current = useValue(`${base}/current`)
  const shownLie = useValue(`${base}/shownLie`)
  const curEntry = useValue(current ? `${base}/entry/${current}` : null)
  const myVote = useValue(current ? `${base}/vote/${current}/${me.id}` : null)
  const [items, setItems] = useState(['', '', ''])
  const [lie, setLie] = useState(0)

  // 아직 제출 안 함 → 입력
  if (!mine?.items) {
    const submit = () => {
      if (items.some((t) => !t.trim())) return
      dbSet(`${base}/entry/${me.id}`, { items: items.map((t) => t.trim()), lie })
    }
    return (
      <div>
        <p className="text-center mb-2" style={{ color: 'var(--ink-soft)' }}>진실 2 + 거짓 1 (거짓에 체크)</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <button onClick={() => setLie(i)} className="w-8 h-8 rounded-full shrink-0 clay-btn text-sm" style={lie === i ? { background: 'var(--c-coral)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }} title="거짓으로 지정">{lie === i ? '거짓' : i + 1}</button>
            <input value={items[i]} onChange={(e) => setItems((a) => a.map((v, k) => (k === i ? e.target.value : v)))} placeholder={`문장 ${i + 1}`} className="clay-inset flex-1 min-w-0 px-3 py-2.5" />
          </div>
        ))}
        <Button className="w-full mt-1" onClick={submit} disabled={items.some((t) => !t.trim())}>제출</Button>
      </div>
    )
  }

  // 제출함 → 진행 대기 / 투표
  if (!current) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>제출 완료! 진행자가 한 명씩 공개합니다 🎭</p>
  if (current === me.id) return <p className="text-center font-display text-lg">내 차례! 다들 내 거짓을 찾는 중… 🤫</p>

  const items3 = curEntry?.items || []
  return (
    <div className="text-center">
      <p className="font-display mb-2">{players.find((p) => p.id === current)?.nickname} 의 거짓은?</p>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => {
          const chosen = myVote === i
          const isLie = shownLie && i === curEntry?.lie
          return (
            <button key={i} onClick={() => !shownLie && dbSet(`${base}/vote/${current}/${me.id}`, i)} disabled={shownLie}
              className="clay-btn w-full px-4 py-3 text-left"
              style={isLie ? { background: 'var(--c-coral)', color: '#fff' } : chosen ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <b className="mr-2">{i + 1}.</b>{items3[i]}{isLie ? ' · 거짓!' : chosen ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      {shownLie && <p className="mt-2 text-sm" style={{ color: myVote === curEntry?.lie ? 'var(--c-mint)' : 'var(--ink-soft)' }}>{myVote === curEntry?.lie ? '정답! 🎉' : '아쉽 😅'}</p>}
    </div>
  )
}

export default {
  id: 'twotruths',
  name: '투 트루스',
  emoji: '🎭',
  tagline: '2진실 1거짓 · 거짓 찾기',
  genres: ['mind', 'party'],
  traits: ['solo'],
  controls: { prompt: false, reveal: false },
  HostView,
  PlayerView,
}
