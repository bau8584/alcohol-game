// ⋮ 설정 케밥 — 상단 우측 버튼 뭉치(방코드·참가QR·테마·19금·초기화·테스트명단)를 하나로 모은 드롭다운.
// 큰 화면(/host)과 '진행자도 참가자' 폰 진행 탭에서 공용. QR 모달은 부모가 소유(onShowQR).
import { useEffect, useRef, useState } from 'react'
import { resetRoom, clearSeeds, setAdultEnabled } from '../lib/actions'
import { hasAdultConsent, setAdultConsent } from '../lib/adult'
import { THEMES, getTheme, applyTheme } from '../lib/theme'
import { Button } from './ui'

export default function SettingsMenu({ roomId, meta, players, onShowQR }) {
  const [open, setOpen] = useState(false)
  const [askAdult, setAskAdult] = useState(false)
  const [theme, setTheme] = useState(getTheme())
  const ref = useRef(null)
  const enabled = !!meta?.adultEnabled
  const hasSeeds = players.some((p) => p.seed)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const pickTheme = (id) => { applyTheme(id); setTheme(id) }
  const toggleAdult = () => {
    if (enabled) return setAdultEnabled(roomId, false)
    if (hasAdultConsent()) setAdultEnabled(roomId, true)
    else setAskAdult(true)
  }
  const confirmAdult = () => { setAdultConsent(true); setAdultEnabled(roomId, true); setAskAdult(false) }
  const doReset = () => {
    if (confirm('참가자·점수·재화·진행상태를 모두 지우고 처음 상태로 초기화할까요?')) { resetRoom(roomId); setOpen(false) }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="clay w-10 h-10 rounded-xl text-2xl leading-none flex items-center justify-center"
        style={{ background: 'var(--surface)', color: 'var(--ink)' }}
        title="설정" aria-label="설정"
      >
        ⋮
      </button>

      {open && (
        <div className="clay absolute right-0 mt-2 p-3 z-50 w-64 space-y-3" style={{ background: 'var(--surface)' }}>
          {/* 방 코드 + 참가 QR */}
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>방 코드</div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl tracking-widest flex-1">{roomId}</span>
              <button
                onClick={() => { onShowQR?.(); setOpen(false) }}
                className="clay-btn px-3 py-2 text-sm font-bold shrink-0"
                style={{ background: 'var(--c-mint)', color: '#fff' }}
              >
                📱 참가 QR
              </button>
            </div>
          </div>

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

          {/* 19금 토글 */}
          <button
            onClick={toggleAdult}
            className="clay-btn w-full py-2 px-3 flex items-center justify-between text-sm font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            <span>🔞 19금 콘텐츠</span>
            <span style={{ color: enabled ? '#e64545' : 'var(--ink-soft)' }}>{enabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 테스트 명단 (시드 있을 때만) */}
          {hasSeeds && (
            <button
              onClick={() => { clearSeeds(roomId); setOpen(false) }}
              className="clay-btn w-full py-2 px-3 text-sm font-bold text-left"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              🧪 테스트 명단 지우기
            </button>
          )}

          {/* 초기화 */}
          <button
            onClick={doReset}
            className="clay-btn w-full py-2 px-3 text-sm font-bold"
            style={{ background: 'var(--c-coral)', color: '#fff' }}
          >
            🧹 방 초기화
          </button>
        </div>
      )}

      {askAdult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setAskAdult(false)}>
          <div className="clay p-5 w-full max-w-sm text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">🔞</div>
            <h3 className="font-display text-xl mt-2">성인 콘텐츠 확인</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              19금 콘텐츠는 <b>만 19세 이상</b> 대상입니다.<br />본인 및 참가자가 만 19세 이상이며 이용에 동의하십니까?
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" style={{ background: '#e64545', color: '#fff' }} onClick={confirmAdult}>예, 만 19세 이상</Button>
              <Button variant="ghost" className="flex-1" onClick={() => setAskAdult(false)}>아니오</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
