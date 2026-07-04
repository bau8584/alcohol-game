// 뒤로가기 버튼 — 홈으로. onBack 을 주면 그 동작을 우선 실행.
import { useNavigate } from 'react-router-dom'

export default function BackButton({ onBack, label = '홈', className = '' }) {
  const nav = useNavigate()
  return (
    <button
      onClick={() => (onBack ? onBack() : nav('/'))}
      className={`clay px-3 py-2 text-sm font-bold ${className}`}
      style={{ background: 'var(--surface)', color: 'var(--ink)' }}
      title="뒤로"
    >
      ← {label}
    </button>
  )
}
