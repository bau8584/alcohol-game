// 누가 썼게? — 질문에 전원 익명으로 한 줄 답 제출 → 공개 때 답들이 섞여 뜨고,
// 각 답이 '누구 답'인지 다 같이 맞힌다. 호스트가 하나씩 정체를 깐다. (완벽 익명 = 웹 고유)
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

// id 정렬 기반의 결정적 셔플 (공개 순서 고정 · 저자 숨김)
const stableShuffle = (arr) => {
  return [...arr]
    .map((e) => ({ e, k: hash(e.id) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.e)
}
const hash = (s) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

// 질문 풀 — 🎲 일반 / 🎲 19금(빨강). 익명으로 한 줄 답 → 누가 썼게?
const NORMAL = [
  '무인도에 딱 하나 가져간다면?',
  '로또 1등 되면 제일 먼저 할 일?',
  '죽기 전에 꼭 해보고 싶은 것?',
  '이 모임을 한 단어로?',
  '가장 최근에 한 거짓말은?',
  '요즘 제일 큰 고민 한 단어?',
  '내 인생 최고의 흑역사 한 단어?',
  '지금 제일 먹고 싶은 것?',
  '가장 이상한 내 소비 습관?',
  '10억 생기면 사고 싶은 것?',
  '내 별명으로 어울리는 동물?',
  '무인도에 같이 갈 이 방 사람은?',
  '이 방에서 제일 친해지고 싶은 사람은?',
  '내가 몰래 좋아하는 취미는?',
  '가장 후회되는 과거의 선택은?',
]
const ADULT = [
  '이 방에서 하룻밤 상대로 고른다면? (익명)',
  '이 방에서 몰래 스킨십하고 싶은 사람은?',
  '지금까지 사귄 사람 수는?',
  '첫 경험 나이는?',
  '내 은밀한 취향 한 가지?',
  '가장 야했던 꿈 내용 한 줄?',
  '최근 야한 상상 한 장면?',
  '내 몸에서 제일 자신 있는 부위는?',
  '가장 위험했던 장소에서의 스킨십은?',
  '가장 부끄러운 검색 기록은?',
  '전 애인과 다시 자고 싶다? (예/아니오)',
  '연애할 때 밝히는 정도 (10점 만점)?',
  '내가 해본 가장 야한 일 한 줄?',
  '커플 되면 제일 하고 싶은 야한 것은?',
  '이 방에서 제일 밤에 셀 것 같은 사람은?',
  '내 최고의 연애 흑역사 한 줄?',
]

function HostView({ base, meta, players, writePrompt }) {
  const ansRaw = useValue(`${base}/ans`)
  const reveal = meta.roundStatus === 'reveal'
  const [q, setQ] = useState(meta.prompt || '')
  useEffect(() => { setQ(meta.prompt || '') }, [meta.roundSeq]) // 새 질문마다 입력창 리셋
  const writeQ = (v) => { setQ(v); writePrompt?.(v) }
  const rollFrom = (arr) => writeQ(arr[Math.floor(Math.random() * arr.length)])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const entries = useMemo(() => toList(ansRaw).filter((e) => (e.value || '').trim()), [ansRaw])
  const shuffled = useMemo(() => stableShuffle(entries), [entries])
  const notYet = players.filter((p) => !entries.some((e) => e.id === p.id))
  const [shown, setShown] = useState({}) // { entryId: true } 정체 공개

  return (
    <div className="text-center">
      {!reveal && (
        <div className="mb-3 max-w-md mx-auto">
          <input value={q} onChange={(e) => writeQ(e.target.value)} placeholder="질문 (직접 입력 또는 주사위)" className="clay-inset w-full px-3 py-2.5 text-center" />
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={() => rollFrom(NORMAL)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 질문">🎲 일반</button>
            {meta.adultEnabled && <button onClick={() => rollFrom(ADULT)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
          </div>
        </div>
      )}
      <div className="font-display text-2xl">{meta.prompt || '질문을 정하세요'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{entries.length}/{players.length} 제출{!reveal && ' · 익명 수집 중'}</div>

      {reveal ? (
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {shuffled.map((e, i) => (
            <div key={e.id} className="clay-inset px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-display mr-2" style={{ color: 'var(--c-grape)' }}>{i + 1}.</span>
                <span className="font-bold">{e.value}</span>
                {shown[e.id] && <span className="ml-2 text-sm" style={{ color: 'var(--c-coral)' }}>— {byId[e.id]?.nickname || '?'}</span>}
              </div>
              {!shown[e.id] && (
                <button onClick={() => setShown((s) => ({ ...s, [e.id]: true }))} className="clay-btn px-3 py-1 text-sm shrink-0" style={{ background: 'var(--c-grape)', color: '#fff' }}>정체 공개</button>
              )}
            </div>
          ))}
          {!shuffled.length && <p className="text-center py-6" style={{ color: 'var(--ink-soft)' }}>제출된 답이 없어요.</p>}
        </div>
      ) : (
        <div className="mt-4">
          <p style={{ color: 'var(--ink-soft)' }}>익명으로 답 받는 중… 👁 ‘공개’ 누르면 다 같이 누구 답인지 맞히기!</p>
          {notYet.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
              {notYet.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname}</span>))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mine = useValue(`${base}/ans/${me.id}`)
  const [text, setText] = useState('')
  const open = meta.roundStatus === 'open'
  const submit = () => text.trim() && dbSet(`${base}/ans/${me.id}`, text.trim())

  if (meta.roundStatus === 'reveal') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl">🕵️</div>
        <p className="mt-3 font-display text-xl">메인 화면에서 정체 맞히기!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>내 답: {mine || '(미제출)'}</p>
      </div>
    )
  }
  return (
    <div className="text-center">
      <p className="font-display text-lg mb-1">{meta.prompt || '질문 대기 중…'}</p>
      <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>완벽 익명! 나만의 답을 써봐요 😎</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!open} rows={2} className="w-full clay-inset px-4 py-3 resize-none" placeholder="한 줄로 답하기" />
      <Button className="mt-2 w-full" onClick={submit} disabled={!open || !text.trim()}>{mine ? '답 수정' : '익명 제출'}</Button>
      {mine && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: {mine} (수정 가능)</p>}
    </div>
  )
}

export default {
  id: 'whodunit',
  name: '누가 썼게?',
  emoji: '🕵️',
  tagline: '익명 답 · 정체 맞히기 · 소규모',
  genres: ['party'],
  traits: ['anon'],
  HostView,
  PlayerView,
}
