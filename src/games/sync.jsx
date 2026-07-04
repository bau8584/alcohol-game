// 4. 싱크로율 텔레파시 — 제시어 보고 같은 단어 입력, 서버가 일치 개수 자동 집계.
import { useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

function groupWords(raw, players) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const groups = {}
  toList(raw).forEach((e) => {
    const key = norm(e.value)
    if (!key) return
    ;(groups[key] = groups[key] || []).push(byId[e.id]?.nickname || e.id)
  })
  return Object.entries(groups)
    .map(([word, names]) => ({ word, names, count: names.length }))
    .sort((a, b) => b.count - a.count)
}

function HostView({ base, meta, players }) {
  const raw = useValue(`${base}/word`)
  const groups = useMemo(() => groupWords(raw, players), [raw, players])
  const submitted = toList(raw).length
  const reveal = meta.roundStatus === 'reveal'

  return (
    <div className="text-center">
      <div className="text-2xl font-black">{meta.prompt || '제시어를 입력하세요'}</div>
      <div className="mt-1 text-white/50">
        {submitted}/{players.length} 제출{!reveal && ' · 공개 전'}
      </div>
      {reveal ? (
        <div className="mt-5 space-y-2 max-w-xl mx-auto text-left">
          {groups.map((g) => (
            <div
              key={g.word}
              className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                g.count >= 2 ? 'bg-emerald-500/20 border border-emerald-400/40' : 'bg-white/5'
              }`}
            >
              <div>
                <span className="text-xl font-black">{g.word}</span>
                <span className="ml-2 text-sm text-white/50">{g.names.join(', ')}</span>
              </div>
              <span className="text-2xl font-black tabular-nums">
                {g.count}
                {g.count >= 2 && ' 💞'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-white/40 text-xl animate-pulse">제출 대기 중… (공개 누르면 결과 표시)</p>
      )}
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
      <p className="text-white/60">{meta.prompt || '제시어에 맞는 단어를 입력'}</p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!open}
        className="mt-3 w-full rounded-xl bg-white/10 px-4 py-4 text-xl text-center outline-none disabled:opacity-40"
        placeholder="팀원과 텔레파시!"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button className="mt-3 w-full" onClick={submit} disabled={!open || !text.trim()}>
        제출 {mine && '(수정)'}
      </Button>
      {mine && <p className="mt-2 text-sm text-emerald-400">제출됨: {mine}</p>}
    </div>
  )
}

export default {
  id: 'sync',
  name: '싱크로 텔레파시',
  emoji: '💞',
  tagline: '텍스트 일치 자동 집계',
  promptLabel: '제시어 (예: 겨울 하면 떠오르는 것)',
  HostView,
  PlayerView,
}
