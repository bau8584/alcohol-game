// 양세찬 게임 (콜 마이 네임) — 참가자가 서로에게 이마 단어를 '직접 써준다'.
// 흐름: 호스트가 주제(카테고리) 선택 → 링(누가 누구에게) 자동 배정 → 각자 배정된 사람에게 단어 작성 →
//       다 쓰면 내 폰엔 남들 단어만 보이고 내 것만 ❓ → 질문해서 내 단어 맞히기.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate } from '../lib/db'
import { Button } from '../components/ui'

// 카테고리 = 작성 가이드(예시). 참가자는 이 주제로 자유롭게 써준다.
const CATEGORIES = [
  { key: 'star', label: '연예인', hint: '예: 아이유, 손흥민, 유재석' },
  { key: 'animal', label: '동물', hint: '예: 사자, 펭귄, 카피바라' },
  { key: 'food', label: '음식', hint: '예: 치킨, 마라탕, 곱창' },
  { key: 'char', label: '캐릭터', hint: '예: 뽀로로, 피카츄, 짱구' },
  { key: 'job', label: '직업', hint: '예: 의사, 유튜버, 프로게이머' },
  { key: 'movie', label: '영화·드라마', hint: '예: 기생충, 오징어게임' },
  { key: 'free', label: '자유', hint: '뭐든 자유롭게!' },
  { key: 'adult', label: '19금', hint: '야한 단어·인물 (수위 UP 🔞)' },
]
const catByKey = (k) => CATEGORIES.find((c) => c.key === k) || null

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const toRing = (r) => (Array.isArray(r) ? r : r ? Object.values(r) : [])
// 링에서 pid가 써줄 대상 = 다음 사람
const targetOf = (ring, pid) => {
  const i = ring.indexOf(pid)
  return i < 0 || ring.length < 2 ? null : ring[(i + 1) % ring.length]
}

/* ═══════════ 호스트 ═══════════ */
function HostView({ base, meta, players }) {
  const category = useValue(`${base}/category`)
  const ringRaw = useValue(`${base}/ring`)
  const wordsRaw = useValue(`${base}/word`)
  const reveal = meta.roundStatus === 'reveal'
  const ring = toRing(ringRaw)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const cat = catByKey(category)

  const start = (c) => {
    if (players.length < 2) return alert('최소 2명 필요.')
    dbUpdate(base, { category: c.key, ring: shuffle(players.map((p) => p.id)), word: null })
  }
  const written = ring.filter((pid) => wordsRaw?.[pid]).length

  return (
    <div className="text-center">
      <p className="font-display text-lg">🃏 서로에게 이마 단어를 써주는 양세찬 게임</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>주제 고르면 '누가 누구에게' 자동 배정 → 각자 써주기 → 질문으로 맞히기</p>

      {/* 카테고리 */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {CATEGORIES.filter((c) => meta.adultEnabled || c.key !== 'adult').map((c) => {
          const on = category === c.key
          const red = c.key === 'adult'
          return (
            <button key={c.key} onClick={() => start(c)} className="clay-btn px-4 py-2 font-display" style={on ? { background: red ? '#e64545' : 'var(--c-grape)', color: '#fff' } : red ? { background: '#e64545', color: '#fff', opacity: 0.85 } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
              {c.label}{c.key === 'adult' ? ' 🔞' : ''}
            </button>
          )
        })}
      </div>

      {category && ring.length >= 2 && (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>주제: <b style={{ color: 'var(--ink)' }}>{cat?.label}</b> · 작성 {written}/{ring.length}{reveal ? ' · 정답 공개!' : ''}</div>

          {/* 누가 누구에게 써주는지 + 진행 */}
          <div className="grid gap-2 max-w-xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {ring.map((pid, i) => {
              const target = ring[(i + 1) % ring.length]
              const done = !!wordsRaw?.[target]
              return (
                <div key={pid} className="clay-inset px-3 py-2 text-left text-sm">
                  <span className="font-bold">{byId[pid]?.nickname}</span>
                  <span style={{ color: 'var(--ink-soft)' }}> → </span>
                  <span>{byId[target]?.nickname}</span>
                  {reveal ? (
                    <div className="font-display text-lg">{wordsRaw?.[target] || '—'}</div>
                  ) : (
                    <span className="ml-1">{done ? '✅' : '✍️'}</span>
                  )}
                </div>
              )
            })}
          </div>
          {!reveal && written < ring.length && <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>모두 써주면 시작! (아직 {ring.length - written}명)</p>}
        </div>
      )}
    </div>
  )
}

/* ═══════════ 참가자 ═══════════ */
function PlayerView({ base, meta, players, me }) {
  const category = useValue(`${base}/category`)
  const ringRaw = useValue(`${base}/ring`)
  const wordsRaw = useValue(`${base}/word`)
  const reveal = meta.roundStatus === 'reveal'
  const [text, setText] = useState('')

  const ring = toRing(ringRaw)
  const cat = catByKey(category)
  const targetId = targetOf(ring, me.id)
  const targetPlayer = players.find((p) => p.id === targetId)
  const iWrote = targetId ? !!wordsRaw?.[targetId] : true
  const others = useMemo(() => players.filter((p) => p.id !== me.id), [players, me.id])

  if (!category || ring.length < 2) {
    return <p className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>진행자가 주제를 고르는 중… 🃏</p>
  }

  // 1) 배정된 사람에게 단어 써주기
  if (targetId && !iWrote && !reveal) {
    const submit = () => text.trim() && dbSet(`${base}/word/${targetId}`, text.trim())
    return (
      <div className="text-center">
        <p className="font-bold" style={{ color: 'var(--c-grape)' }}>✍️ {targetPlayer?.nickname} 님의 이마 단어를 써주세요</p>
        <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ink-soft)' }}>주제: {cat?.label} · {cat?.hint}</p>
        <input value={text} onChange={(e) => setText(e.target.value)} className="w-full clay-inset px-4 py-4 text-xl text-center" placeholder={`${targetPlayer?.nickname}에게 줄 단어`} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim()}>제출</Button>
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>본인에게 안 보이게! 이 사람 이마에 붙는 단어예요</p>
      </div>
    )
  }

  // 2) 플레이 — 남들 이마 보고 내 단어 맞히기
  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제: <b style={{ color: 'var(--ink)' }}>{cat?.label}</b></div>

      {reveal ? (
        <div className="clay p-5 mt-2" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="opacity-80">내 이마 단어는…</div>
          <div className="font-display text-4xl mt-1">{wordsRaw?.[me.id] || '—'}</div>
          <p className="mt-1 opacity-90">맞혔나요? 😏</p>
        </div>
      ) : (
        <div className="clay p-4 mt-2" style={{ background: 'var(--surface-2)' }}>
          <div className="font-display text-3xl">❓ 나</div>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>내 단어는 비밀! 질문해서 맞혀요</p>
        </div>
      )}

      <div className="mt-4 text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>👀 다른 사람들의 이마 단어</div>
      <div className="grid grid-cols-2 gap-2">
        {others.map((p) => (
          <div key={p.id} className="clay-inset px-3 py-2 text-left">
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.nickname}</div>
            <div className="font-display text-lg">{wordsRaw?.[p.id] || '…작성 중'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default {
  id: 'callmyname',
  name: '양세찬 게임',
  emoji: '🃏',
  tagline: '서로 써주는 이마 단어 · 질문으로 맞히기',
  genres: ['mind', 'party'],
  traits: ['solo'],
  controls: { prompt: false, start: false }, // 주제 선택·작성이 진행 → 시작 버튼 불필요(공개/새 라운드만)
  HostView,
  PlayerView,
}
