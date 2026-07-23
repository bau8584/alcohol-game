// 참가자 질문 풀 뽑기 버튼 — 질문형 게임(군중심리·지목·후던잇 등)의 🎲 옆에 꽂아 재사용.
// 탭 = 풀에서 랜덤 1개를 onPick(text)로 전달 / ▾ = 목록 펼쳐 직접 선택. 뽑아도 풀은 유지.
import { useState } from 'react'
import { useChildList, roomPath } from '../lib/db'

export default function QpoolPick({ roomId, onPick, className = '' }) {
  const [open, setOpen] = useState(false)
  const list = useChildList(roomPath(roomId, 'qpool'))
  if (!list.length) return null

  const ordered = [...list].sort((a, b) => (b.at || 0) - (a.at || 0))
  const pickRandom = () => { onPick(list[Math.floor(Math.random() * list.length)].text); setOpen(false) }
  const pickOne = (t) => { onPick(t); setOpen(false) }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={pickRandom}
        className="clay-btn pl-3 pr-2 py-2 font-display text-sm rounded-r-none"
        style={{ background: 'var(--c-sky)', color: '#fff' }}
        title="참가자들이 로비에서 적은 질문에서 랜덤으로 뽑기"
      >
        📥 참가자질문 <span className="opacity-80">({list.length})</span>
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        className="clay-btn px-2 py-2 text-sm rounded-l-none border-l"
        style={{ background: 'var(--c-sky)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
        title="목록에서 직접 고르기"
      >
        {open ? '▴' : '▾'}
      </button>

      {open && (
        <div
          className="absolute z-30 top-full mt-1 left-0 clay p-2 max-h-64 overflow-y-auto w-64 text-left"
          style={{ background: 'var(--surface)' }}
        >
          <div className="text-xs px-1 pb-1" style={{ color: 'var(--ink-soft)' }}>참가자 질문 · 골라서 넣기</div>
          {ordered.map((q) => (
            <button
              key={q.id}
              onClick={() => pickOne(q.text)}
              className="clay-inset block w-full text-left px-3 py-2 mb-1 text-sm"
              style={{ color: 'var(--ink)' }}
            >
              {q.text}
              <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>— {q.by}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
