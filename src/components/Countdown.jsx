// 서버에 저장된 endsAt(epoch ms)을 받아 남은 시간을 표시. 모든 화면이 동일 값 기준이라 동기화됨.
import { useEffect, useRef, useState } from 'react'

export default function Countdown({ endsAt, size = 'text-6xl', onDone }) {
  const [now, setNow] = useState(Date.now())
  const firedDone = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  const remain = endsAt ? Math.max(0, endsAt - now) : null

  // 남은 시간 0 도달 시 onDone 1회 호출 (훅은 항상 실행되도록 조건부 return 이전에 배치)
  useEffect(() => {
    if (remain === 0 && !firedDone.current) {
      firedDone.current = true
      onDone && onDone()
    }
    if (remain > 0) firedDone.current = false
  }, [remain, onDone])

  if (!endsAt) return null

  const secs = (remain / 1000).toFixed(1)
  const danger = remain < 5000
  return (
    <div className={`font-black tabular-nums ${size} ${danger ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
      {secs}
      <span className="text-2xl opacity-60">s</span>
    </div>
  )
}
