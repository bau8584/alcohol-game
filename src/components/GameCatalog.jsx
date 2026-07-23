// 게임 목록 구경 — 진행자가 게임을 고르는 동안 참가자도 어떤 게임이 있는지 미리 본다(읽기 전용).
// 접기/펼치기 지원. 카드의 ❓로 규칙 미리보기.
import { useState } from 'react'
import { GAMES, isBeginner } from '../games/registry'
import { howById } from '../games/howto'
import HowToPlay from './HowToPlay'
import { Button } from './ui'

export default function GameCatalog({ defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const [previewId, setPreviewId] = useState(null)
  const ordered = [...GAMES].sort((a, b) => (isBeginner(b.id) ? 1 : 0) - (isBeginner(a.id) ? 1 : 0))
  const previewGame = previewId ? GAMES.find((g) => g.id === previewId) : null

  return (
    <div className="clay p-4" style={{ background: 'var(--surface)' }}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full">
        <h3 className="font-display text-lg">🎮 어떤 게임들이 있나</h3>
        <span className="text-xs flex items-center gap-2" style={{ color: 'var(--ink-soft)' }}>
          {GAMES.length}종 <span className="text-base">{open ? '▴' : '▾'}</span>
        </span>
      </button>

      {open && (
        <>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--ink-soft)' }}>진행자가 골라줄 거예요. <b>❓</b>로 규칙 미리보기.</p>
          <div className="grid grid-cols-2 gap-2">
            {ordered.map((g) => (
              <div key={g.id} className="relative clay-inset p-3 text-left">
                <div className="text-2xl">{g.emoji}</div>
                <div className="font-display text-base mt-0.5">{g.name}</div>
                <div className="text-xs mt-0.5 pr-6" style={{ color: 'var(--ink-soft)' }}>{howById(g.id)?.goal || g.tagline}</div>
                <button
                  onClick={() => setPreviewId(g.id)}
                  className="absolute bottom-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center"
                  style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}
                  title="규칙 미리보기"
                >
                  ❓
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {previewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreviewId(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <HowToPlay gameId={previewGame.id} emoji={previewGame.emoji} name={previewGame.name} defaultOpen />
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setPreviewId(null)}>닫기</Button>
          </div>
        </div>
      )}
    </div>
  )
}
