// 19금(성인) 콘텐츠 토글 — 기본 OFF. 켤 때 최초 1회 '만 19세 이상' 자가확인 게이트.
// 진행 콘솔(HostConsole)에 두어 큰 화면(/host)과 '진행자도 참가자' 폰 진행 탭 양쪽에서 접근 가능.
import { useState } from 'react'
import { setAdultEnabled } from '../lib/actions'
import { hasAdultConsent, setAdultConsent } from '../lib/adult'
import { Button } from './ui'

export default function AdultToggle({ roomId, enabled }) {
  const [ask, setAsk] = useState(false)
  const turnOn = () => { if (hasAdultConsent()) setAdultEnabled(roomId, true); else setAsk(true) }
  const confirmAdult = () => { setAdultConsent(true); setAdultEnabled(roomId, true); setAsk(false) }
  return (
    <>
      <button
        onClick={() => (enabled ? setAdultEnabled(roomId, false) : turnOn())}
        className="clay-btn font-display px-3 py-1.5 text-sm shrink-0"
        style={enabled ? { background: '#e64545', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
        title="19금(성인) 콘텐츠 허용 여부 · 진행자만 · 기본 꺼짐"
      >
        🔞 19금 {enabled ? 'ON' : 'OFF'}
      </button>
      {ask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setAsk(false)}>
          <div className="clay p-5 w-full max-w-sm text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">🔞</div>
            <h3 className="font-display text-xl mt-2">성인 콘텐츠 확인</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              19금 콘텐츠는 <b>만 19세 이상</b> 대상입니다.<br />본인 및 참가자가 만 19세 이상이며 성인 콘텐츠 이용에 동의하십니까?
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" style={{ background: '#e64545', color: '#fff' }} onClick={confirmAdult}>예, 만 19세 이상</Button>
              <Button variant="ghost" className="flex-1" onClick={() => setAsk(false)}>아니오</Button>
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>확인은 이 기기에 기억됩니다. 진행자 책임 하에 사용하세요.</p>
          </div>
        </div>
      )}
    </>
  )
}
