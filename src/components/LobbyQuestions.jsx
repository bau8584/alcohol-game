// 로비 질문 풀 — 진행자가 게임을 고르는 사이, 참가자들이 질문/제시어를 미리 적어두는 공용 목록.
// 방 전역(rooms/{roomId}/qpool)·지속. 프롬프트 게임에서 '📥 참가자 질문'으로 재활용된다.
// 접기/펼치기 지원. 예시는 🎲 주사위(일반/19금)로 입력창을 채워 제공.
import { useState } from 'react'
import { useChildList, roomPath } from '../lib/db'
import { addQuestion, removeQuestion } from '../lib/actions'

// 🎲 예시 질문 — 눌러서 입력창을 채운 뒤 손보거나 그대로 추가.
const NORMAL = [
  '가장 최근에 운 사람?',
  '이 중에 연애 세포 제일 많은 사람?',
  '술 취하면 제일 위험한 사람?',
  '10년 뒤 제일 성공할 것 같은 사람?',
  '무인도에 하나만 데려간다면?',
  '몰래 짝사랑 해봤을 것 같은 사람?',
  '거짓말 제일 잘할 것 같은 사람?',
  '연예인 됐으면 떴을 것 같은 사람?',
  '지갑 제일 잘 여는 사람?',
  '방금 화장실 다녀와서 손 안 씻었을 것 같은 사람?',
]
const ADULT = [
  '여기서 가장 야한 상상 많이 할 것 같은 사람?',
  '연애할 때 밀당 제일 심할 것 같은 사람?',
  '전 애인이 제일 많을 것 같은 사람?',
  '술김에 사고 칠 것 같은 사람?',
  '클럽에서 제일 잘 놀 것 같은 사람?',
]
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// canManage=true(진행자)면 자기 것뿐 아니라 목록의 모든 질문을 삭제할 수 있다.
export default function LobbyQuestions({ roomId, me, adult = false, defaultOpen = true, canManage = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [text, setText] = useState('')
  const list = useChildList(roomPath(roomId, 'qpool'))

  const submit = () => {
    const v = text.trim()
    if (!v) return
    addQuestion(roomId, v, me?.nickname, me?.id)
    setText('')
  }

  const ordered = [...list].sort((a, b) => (b.at || 0) - (a.at || 0))

  return (
    <div className="clay p-4" style={{ background: 'var(--surface)' }}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full">
        <h3 className="font-display text-lg">📝 질문 미리 적기</h3>
        <span className="text-xs flex items-center gap-2" style={{ color: 'var(--ink-soft)' }}>
          {list.length}개 모임 <span className="text-base">{open ? '▴' : '▾'}</span>
        </span>
      </button>

      {open && (
        <>
          <p className="text-xs mt-1 mb-3" style={{ color: 'var(--ink-soft)' }}>
            여기 적은 질문은 게임(진선미·군중심리·후던잇 등)에서 진행자가 뽑아 써요. 심심할 때 하나씩!
          </p>

          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="예) 이 중에 제일 취한 사람?"
              maxLength={120}
              className="clay-inset flex-1 min-w-0 px-4 py-2.5"
            />
            <button onClick={submit} disabled={!text.trim()} className="clay-btn px-4 font-display shrink-0 disabled:opacity-40" style={{ background: 'var(--c-grape)', color: '#fff' }}>추가</button>
          </div>

          {/* 🎲 예시 채우기 — 뭘 적을지 막막할 때. 채운 뒤 손봐도 되고 그대로 추가해도 됨. */}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setText(pick(NORMAL))} className="clay-btn px-4 py-2 text-sm font-display" style={{ background: 'var(--c-grape)', color: '#fff' }} title="예시 질문 채우기">🎲 예시</button>
            {adult && <button onClick={() => setText(pick(ADULT))} className="clay-btn px-4 py-2 text-sm font-display" style={{ background: '#e64545', color: '#fff' }} title="19금 예시 채우기">🎲 19</button>}
          </div>

          {/* 쌓인 질문 목록 (최신순) */}
          <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {ordered.map((q) => {
              const mine = q.byId && me?.id && q.byId === me.id
              const canDelete = mine || canManage
              return (
                <div key={q.id} className="clay-inset flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>{q.text}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--ink-soft)' }}>{q.by}</span>
                  {canDelete && (
                    <button onClick={() => removeQuestion(roomId, q.id)} className="text-xs shrink-0" style={{ color: 'var(--c-coral)' }} title={mine ? '내 질문 삭제' : '진행자: 질문 삭제'}>✕</button>
                  )}
                </div>
              )
            })}
            {!ordered.length && <p className="text-center text-sm py-4" style={{ color: 'var(--ink-soft)' }}>아직 없어요 — 첫 질문을 남겨보세요! ✍️</p>}
          </div>
        </>
      )}
    </div>
  )
}
