// 싱크로 텔레파시 — 제시어 보고 같은 단어 입력, 서버가 일치 개수 자동 집계.
import { useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

function HostView({ base, meta, players }) {
  const raw = useValue(`${base}/word`)
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
  traits: [],
  promptLabel: '제시어 (예: 겨울 하면 떠오르는 것)',
  HostView,
  PlayerView,
}
