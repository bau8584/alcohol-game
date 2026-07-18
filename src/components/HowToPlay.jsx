// '이렇게 해요' 규칙 카드 — 게임 시작 시 목표 + 스텝을 접이식으로 보여준다.
// 처음 온 사람도 진행자 설명 없이 이해하도록. 호출부에서 key={gameId}를 주면 새 게임마다 다시 펼쳐진다.
import { useState } from 'react'
import { howById } from '../games/howto'

export default function HowToPlay({ gameId, emoji, name, defaultOpen = true, compact = false }) {
  const how = howById(gameId)
  const [open, setOpen] = useState(defaultOpen)
  if (!how) return null

  return (
    <div className="clay" style={{ background: 'var(--surface)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-xl shrink-0">{emoji || '❓'}</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-tight">
            이렇게 해요{name ? ` · ${name}` : ''}
          </div>
          {!open && <div className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>{how.goal}</div>}
        </div>
        <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className={`px-4 pb-4 ${compact ? 'text-sm' : ''}`}>
          <div className="clay-inset px-3 py-2 mb-3">
            <span className="text-xs font-bold" style={{ color: 'var(--c-grape)' }}>🎯 목표 </span>
            <span className="font-bold">{how.goal}</span>
          </div>
          <ol className="space-y-1.5">
            {how.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="shrink-0 w-5 h-5 rounded-full font-display text-xs flex items-center justify-center mt-0.5"
                  style={{ background: 'var(--c-grape)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1">{s}</span>
              </li>
            ))}
          </ol>
          {how.tip && (
            <div className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>💡 {how.tip}</div>
          )}
        </div>
      )}
    </div>
  )
}
