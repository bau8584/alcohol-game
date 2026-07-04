// 홈 버튼 — 첫 화면으로 이동. onBack 을 주면 그 동작을 우선 실행.
// (뒤로가기가 아니라 '홈'이라는 걸 분명히 하려고 집 아이콘 사용)
import { useNavigate } from 'react-router-dom'

export default function BackButton({ onBack, label = '홈', className = '' }) {
  const nav = useNavigate()
  return (
    <button
      onClick={() => (onBack ? onBack() : nav('/'))}
      className={`clay px-3 py-2 text-sm font-bold ${className}`}
      style={{ background: 'var(--surface)', color: 'var(--ink)' }}
      title="홈으로"
    >
      {label ? `🏠 ${label}` : '🏠'}
    </button>
  )
}
