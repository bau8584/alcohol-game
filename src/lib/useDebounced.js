// 값이 잦게 바뀌는 입력(타이핑)의 DB 쓰기를 지연·병합하는 디바운스 훅.
// 로컬 상태는 즉시 갱신하고, 실제 dbSet은 마지막 입력 후 delay 뒤 한 번만 → 방 전원 재전송 횟수 급감.
import { useCallback, useEffect, useRef } from 'react'

export function useDebounced(fn, delay = 400) {
  const timer = useRef()
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => () => clearTimeout(timer.current), [])
  return useCallback(
    (...args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), delay)
    },
    [delay]
  )
}
