// 테마 선택기 — '테마' 버튼을 누르면 4종을 목록으로 펼쳐 골라 바꾼다.
// 선택은 localStorage(agw.theme)에 저장돼 새로고침·다음 접속에도 유지됨(lib/theme).
import { useEffect, useRef, useState } from 'react'
import { THEMES, getTheme, applyTheme } from '../lib/theme'

export default function ThemeSwitcher({ className = '' }) {
  const [cur, setCur] = useState(getTheme())
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const t = THEMES.find((x) => x.id === cur) || THEMES[0]

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const pick = (id) => {
    applyTheme(id) // 적용 + localStorage 저장(지속)
    setCur(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="clay px-3 py-2 text-sm font-bold flex items-center gap-1.5"
        style={{ background: 'var(--surface)', color: 'var(--ink)' }}
        title="테마 변경"
      >
        🎨 <span>테마</span>
        <span style={{ color: 'var(--ink-soft)' }}>· {t.emoji}</span>
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>▼</span>
      </button>

      {open && (
        <div
          className="clay absolute right-0 mt-2 p-2 z-50 w-44"
          style={{ background: 'var(--surface)' }}
        >
          <div className="px-2 pb-1.5 text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>테마 선택</div>
          <div className="grid gap-1">
            {THEMES.map((th) => {
              const active = th.id === cur
              return (
                <button
                  key={th.id}
                  onClick={() => pick(th.id)}
                  className="clay-btn flex items-center gap-2 px-3 py-2 text-sm font-bold text-left"
                  style={active ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  <span className="text-lg">{th.emoji}</span>
                  <span className="flex-1">{th.name}</span>
                  {active && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
