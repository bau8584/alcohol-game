// 싱크로 텔레파시 — 제시어 보고 같은 단어 입력, 서버가 일치 개수 자동 집계.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

// 제시어 풀 — 🎲 일반 / 🎲 19금(빨강). 팀원과 같은 단어를 적어 맞히는 게임
const NORMAL = [
  '겨울 하면 떠오르는 것',
  '술자리 최고의 안주',
  '스키장 하면 떠오르는 단어',
  '숙취에 좋은 음식',
  '첫 데이트 장소',
  '여행 가고 싶은 나라',
  '치킨 하면 떠오르는 브랜드',
  '전 애인 생각나는 노래',
  '이상형의 직업',
  'MT 하면 떠오르는 것',
  '비 오는 날 먹고 싶은 것',
  '최고의 라면 브랜드',
  '삼겹살엔 이 술',
  '스트레스 풀리는 방법',
  '무인도에 가져갈 한 가지',
  '결혼하고 싶은 연예인',
  '가장 좋아하는 계절',
  '최고의 해장 음식',
  '겨울 데이트 코스',
  '남자/여자 하면 떠오르는 연예인',
]
const ADULT = [
  '키스하기 좋은 장소',
  '이성의 가장 섹시한 신체 부위',
  '연인과 하고 싶은 은밀한 데이트',
  '침대에서 듣고 싶은 한마디',
  '가장 야한 노래 제목',
  '모텔 하면 떠오르는 것',
  '가장 섹시하다고 생각하는 연예인',
  '스킨십 중 가장 설레는 순간',
  '연애할 때 가장 흥분되는 순간',
  '이성의 향기 중 가장 끌리는 것',
  '첫 경험 하면 떠오르는 단어',
  '연인에게 듣고 싶은 야한 별명',
  '여름밤 하면 떠오르는 야릇한 것',
  '가장 야했던 꿈의 장소',
  '이성에게 가장 설레는 행동',
  '야한 상상 속 이상형의 직업',
  '연인과 가보고 싶은 은밀한 장소',
  '가장 유혹적인 향수 향',
]

function HostView({ base, meta, players, writePrompt }) {
  const raw = useValue(`${base}/word`)
  const [q, setQ] = useState(meta.prompt || '')
  useEffect(() => { setQ(meta.prompt || '') }, [meta.roundSeq]) // 새 라운드마다 입력창 리셋
  const writeQ = (v) => { setQ(v); writePrompt?.(v) }
  const rollFrom = (arr) => writeQ(arr[Math.floor(Math.random() * arr.length)])
  const groups = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const g = {}
    toList(raw).forEach((e) => {
      const k = norm(e.value)
      if (k) (g[k] = g[k] || []).push(byId[e.id]?.nickname || e.id)
    })
    return Object.entries(g).map(([w, names]) => ({ w, names, c: names.length })).sort((a, b) => b.c - a.c)
  }, [raw, players])
  const reveal = meta.roundStatus === 'reveal'
  return (
    <div className="text-center">
      {!reveal && (
        <div className="mb-3 max-w-md mx-auto">
          <input value={q} onChange={(e) => writeQ(e.target.value)} placeholder="제시어 (직접 입력 또는 주사위)" className="clay-inset w-full px-3 py-2.5 text-center" />
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={() => rollFrom(NORMAL)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲</button>
            <button onClick={() => rollFrom(ADULT)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>
          </div>
        </div>
      )}
      <div className="font-display text-2xl">{meta.prompt || '제시어'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{toList(raw).length}/{players.length} 제출{!reveal && ' · 공개 전'}</div>
      {reveal ? (
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {groups.map((g) => (
            <div key={g.w} className="clay flex items-center justify-between px-4 py-3" style={{ background: g.c >= 2 ? 'var(--c-mint)' : 'var(--surface)', color: g.c >= 2 ? '#fff' : 'var(--ink)' }}>
              <div><span className="font-display text-xl">{g.w}</span> <span className="text-sm opacity-70">{g.names.join(', ')}</span></div>
              <span className="font-display text-2xl">{g.c}{g.c >= 2 && '💞'}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>제출 대기 중… 👁 ‘공개’로 결과 표시</p>}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mine = useValue(`${base}/word/${me.id}`)
  const [text, setText] = useState('')
  const open = meta.roundStatus === 'open'
  const submit = () => text.trim() && dbSet(`${base}/word/${me.id}`, text.trim())
  return (
    <div className="text-center">
      <p style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '제시어에 맞는 단어'}</p>
      <input value={text} onChange={(e) => setText(e.target.value)} disabled={!open} className="mt-3 w-full clay-inset px-4 py-4 text-xl text-center" placeholder="팀원과 텔레파시!" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <Button className="mt-3 w-full" onClick={submit} disabled={!open || !text.trim()}>제출 {mine && '(수정)'}</Button>
      {mine && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: {mine}</p>}
    </div>
  )
}

export default {
  id: 'sync',
  name: '싱크로',
  emoji: '💞',
  tagline: '텔레파시 단어 일치',
  genres: ['telepathy'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
