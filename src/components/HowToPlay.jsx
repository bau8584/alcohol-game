// '이렇게 해요' 규칙 카드 — 한눈에 들어오게: ① 큰 한 줄 액션 ② ✅승리/🍺벌칙 한 줄 ③ 자세히(진행 순서, 접힘).
// 처음 온 사람도 진행자 설명 없이 이해하도록. 호출부에서 key={gameId}를 주면 새 게임마다 다시 펼쳐진다.
// 스키마: { action(헤드라인) | goal(구), win?, lose?, steps: [...], tip? }
import { useState } from 'react'
import { howById } from '../games/howto'

export default function HowToPlay({ gameId, emoji, name, defaultOpen = true, compact = false }) {
  const how = howById(gameId)
  const [open, setOpen] = useState(defaultOpen)
  const [showSteps, setShowSteps] = useState(false)
  if (!how) return null
  const action = how.action || how.goal // 하위호환: 옛 goal을 헤드라인으로

  return (
    <div className="clay" style={{ background: 'var(--surface)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-2xl shrink-0">{emoji || '❓'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>이렇게 해요{name ? ` · ${name}` : ''}</div>
          <div className={`font-display leading-tight ${open ? (compact ? 'text-lg' : 'text-xl') : 'text-base truncate'}`}>{action}</div>
        </div>
        <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* ✅ 승리 / 🍺 벌칙 — 파티게임에서 제일 궁금한 두 줄 */}
          {(how.win || how.lose) && (
            <div className="flex flex-wrap gap-2">
              {how.win && (
                <span className="clay-inset px-3 py-1.5 text-sm font-bold flex items-center gap-1" style={{ color: 'var(--c-mint)' }}>✅ {how.win}</span>
              )}
              {how.lose && (
                <span className="clay-inset px-3 py-1.5 text-sm font-bold flex items-center gap-1" style={{ color: 'var(--c-coral)' }}>🍺 {how.lose}</span>
              )}
            </div>
          )}

          {/* 자세히 — 진행 순서(스텝) + 팁, 기본 접힘 */}
          {how.steps?.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowSteps((v) => !v)} className="text-sm font-bold" style={{ color: 'var(--c-grape)' }}>
                {showSteps ? '진행 순서 접기 ▲' : '진행 순서 자세히 ▼'}
              </button>
              {showSteps && (
                <>
                  <ol className="space-y-1.5 mt-2">
                    {how.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
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
                  {how.tip && <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>💡 {how.tip}</div>}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
