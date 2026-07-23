// ⋮ 참가자 설정 케밥 — 상단바를 단순화하려고 참가QR·진행자되기·테마·나가기를 하나로 모은 드롭다운.
// (호스트용 SettingsMenu의 참가자 버전. QR 모달은 부모가 소유 → onShowQR / 나가기 → onLeave)
import { useEffect, useRef, useState } from 'react'
import { claimHost } from '../lib/actions'
import { THEMES, getTheme, applyTheme } from '../lib/theme'
import { Button } from './ui'

export default function PlayerMenu({ roomId, playerId, onShowQR, onLeave }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getTheme())
  const [askHost, setAskHost] = useState(false)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const pickTheme = (id) => { applyTheme(id); setTheme(id) }
  const submitPin = async () => {
    if (await claimHost(roomId, playerId, pin)) { setAskHost(false); setPin(''); setErr(''); setOpen(false) }
    else setErr('PIN이 달라요')
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="clay w-10 h-10 rounded-xl text-2xl leading-none flex items-center justify-center"
        style={{ background: 'var(--surface)', color: 'var(--ink)' }}
        title="메뉴" aria-label="메뉴"
      >
        ⋮
      </button>

      {open && (
        <div className="clay absolute right-0 mt-2 p-3 z-50 w-60 space-y-3" style={{ background: 'var(--surface)' }}>
          {/* 참가 QR */}
          <button
            onClick={() => { onShowQR?.(); setOpen(false) }}
            className="clay-btn w-full py-2 px-3 text-sm font-bold flex items-center gap-2"
            style={{ background: 'var(--c-mint)', color: '#fff' }}
          >
            📱 참가 QR · 코드 <span className="tracking-widest">{roomId}</span>
          </button>

          {/* 진행자 되기 */}
          {!askHost ? (
            <button
              onClick={() => { setAskHost(true); setErr('') }}
              className="clay-btn w-full py-2 px-3 text-sm font-bold text-left flex items-center gap-2"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              🎙️ 진행자 되기 <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>(PIN 필요)</span>
            </button>
          ) : (
            <div className="clay-inset p-2">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>🎙️ PIN 입력 → 진행 + 참여 동시</div>
              <input
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }}
                inputMode="numeric" placeholder="호스트 PIN" autoFocus
                className="clay-inset w-full px-3 py-2 text-center text-sm"
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
              />
              {err && <p className="mt-1 text-xs font-bold" style={{ color: 'var(--c-coral)' }}>{err}</p>}
              <div className="flex gap-1.5 mt-2">
                <Button className="flex-1 text-sm py-1.5" onClick={submitPin}>되기</Button>
                <Button variant="ghost" className="text-sm py-1.5" onClick={() => { setAskHost(false); setPin(''); setErr('') }}>취소</Button>
              </div>
            </div>
          )}

          {/* 테마 */}
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>🎨 테마</div>
            <div className="grid grid-cols-4 gap-1">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => pickTheme(th.id)}
                  className="clay-btn py-2 text-lg"
                  style={th.id === theme ? { outline: '2px solid var(--c-mint)' } : {}}
                  title={th.name}
                >
                  {th.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 나가기 */}
          <button
            onClick={() => { setOpen(false); onLeave?.() }}
            className="clay-btn w-full py-2 px-3 text-sm font-bold"
            style={{ background: 'var(--c-coral)', color: '#fff' }}
          >
            🚪 방 나가기
          </button>
        </div>
      )}
    </div>
  )
}
