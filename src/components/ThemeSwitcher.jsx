// 테마 전환 버튼 (누르면 다음 테마로 순환).
import { useState } from 'react'
import { THEMES, getTheme, applyTheme } from '../lib/theme'

export default function ThemeSwitcher({ className = '' }) {
  const [cur, setCur] = useState(getTheme())
  const idx = THEMES.findIndex((t) => t.id === cur)
  const t = THEMES[idx] || THEMES[0]

  const next = () => {
    const n = THEMES[(idx + 1) % THEMES.length]
    applyTheme(n.id)
    setCur(n.id)
  }

  return (
    <button
      onClick={next}
      className={`clay px-3 py-2 text-sm font-bold flex items-center gap-1 ${className}`}
      style={{ background: 'var(--surface)', color: 'var(--ink)' }}
      title="테마 변경"
    >
      {t.emoji} {t.name}
    </button>
  )
}
