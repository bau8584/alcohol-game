// 참가자 화면 최상단 전역 하트(💗) 표시. 탭하면 하트가 뭔지 간단 설명.
import { useState } from 'react'

export default function HeartBar({ hearts = 0 }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="clay-btn px-3 py-1.5 font-display text-base shrink-0"
        style={{ background: 'var(--c-pink)', color: '#fff' }}
        title="하트가 뭔가요?"
      >
        💗 ×{hearts}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setOpen(false)}>
          <div className="clay p-5 w-full max-w-xs text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">💗</div>
            <h3 className="font-display text-xl mt-2">하트가 뭐예요?</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              지금 <b style={{ color: 'var(--c-pink)' }}>💗 {hearts}개</b> 가지고 있어요.<br />
              밤 마지막 <b>하트 시그널</b>에서 <b>마음에 드는 사람</b>에게 몰래 보낼 수 있어요.<br />
              서로 보내면 <b>💘 매칭!</b> (짝사랑은 아무에게도 안 보여요 🤫)
            </p>
            <button onClick={() => setOpen(false)} className="clay-btn mt-4 px-6 py-2 font-display" style={{ background: 'var(--c-pink)', color: '#fff' }}>확인</button>
          </div>
        </div>
      )}
    </>
  )
}
