// 참가자 폰에서 '다 같이 보는 결과 화면'을 읽기전용으로 재사용.
// HostView는 설계상 비밀 정보가 없어(=TV와 동일) 참가자에게 그대로 보여줘도 안전하다.
// 결과 공개(roundStatus='reveal')되면 자동으로 펼쳐지고, 참가자가 토글로 언제든 여닫을 수 있다.
// pointer-events 차단으로 호스트 전용 버튼 오조작 방지(Tv.jsx와 동일한 방식).
import { useEffect, useState } from 'react'

const noop = () => {}

export default function SharedResult({ game, roomId, base, meta, players, teams }) {
  const autoOpen = meta?.roundStatus === 'reveal'
  const [open, setOpen] = useState(autoOpen)

  // 결과가 새로 공개되는 순간 자동으로 펼치기 (참가자가 닫으면 다음 공개 때 다시 펼쳐짐)
  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  if (!game || !base) return null

  return (
    <div className="clay" style={{ background: 'var(--surface)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-xl shrink-0">📊</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-tight">
            결과 화면{autoOpen ? ' · 공개!' : ''}
          </div>
          {!open && (
            <div className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
              다 같이 보는 화면을 내 폰에서 확인
            </div>
          )}
        </div>
        <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="clay-inset p-3 overflow-x-auto pointer-events-none select-none">
            <game.HostView roomId={roomId} base={base} meta={meta} players={players} teams={teams} writePrompt={noop} />
          </div>
        </div>
      )}
    </div>
  )
}
