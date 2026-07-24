// 게임 목록 구경 — 진행자가 게임을 고르는 동안 참가자도 어떤 게임이 있는지 미리 본다(읽기 전용).
// 상황·목적 카테고리 접이식. 카드의 ❓로 규칙 미리보기.
import { useState } from 'react'
import { GAMES, gamesByCategory } from '../games/registry'
import { howById } from '../games/howto'
import HowToPlay from './HowToPlay'
import { Button } from './ui'

export default function GameCatalog({ defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const [previewId, setPreviewId] = useState(null)
  const categories = gamesByCategory()
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
          <div className="space-y-2">
            {categories.map((cat, ci) => (
              <div key={cat.key} className="clay-inset overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <CatHeader cat={cat} defaultOpen={ci === 0} onPreview={setPreviewId} />
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

// 카테고리 헤더 + 게임 카드(읽기 전용, 시작 버튼 없음)
function CatHeader({ cat, defaultOpen, onPreview }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5">
        <span className="font-display flex items-center gap-2">
          <span className="text-lg">{cat.emoji}</span>{cat.label}
          <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{cat.games.length}</span>
        </span>
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 p-2 pt-0">
          {cat.games.map((g) => (
            <div key={g.id} className="relative clay-inset p-3 text-left" style={{ background: 'var(--surface)' }}>
              <div className="text-2xl">{g.emoji}</div>
              <div className="font-display text-base mt-0.5 pr-6">{g.name}</div>
              <div className="text-xs mt-0.5 pr-6" style={{ color: 'var(--ink-soft)' }}>{howById(g.id)?.action || howById(g.id)?.goal || g.tagline}</div>
              <button onClick={() => onPreview(g.id)} className="absolute bottom-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }} title="규칙 미리보기">❓</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
