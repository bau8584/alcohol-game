// 참가 QR — 참가 URL을 인라인 SVG QR로 렌더(오프라인 생성, 외부 요청 없음).
// QR은 밝은 배경 + 어두운 모듈이 필수라 테마와 무관하게 흰 배경으로 고정한다.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function JoinQR({ url, size = 160, className = '' }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }, (err, str) => {
      if (alive && !err) setSvg(str)
    })
    return () => { alive = false }
  }, [url])

  return (
    <div
      className={`bg-white rounded-xl p-2 shrink-0 [&>svg]:block [&>svg]:w-full [&>svg]:h-full ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
