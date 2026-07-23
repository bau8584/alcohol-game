// 로비 질문 풀 — 진행자가 게임을 고르는 사이, 참가자들이 질문/제시어를 미리 적어두는 공용 목록.
// 방 전역(rooms/{roomId}/qpool)·지속. 프롬프트 게임에서 '📥 참가자 질문'으로 재활용된다.
import { useState } from 'react'
import { useChildList } from '../lib/db'
import { roomPath } from '../lib/db'
import { addQuestion, removeQuestion } from '../lib/actions'

const IDEAS = [
  '가장 최근에 운 사람?',
  '무인도에 하나만 가져간다면?',
  '이 중에 연애 세포 제일 많은 사람?',
  '전 애인에게 아직 연락 오는 사람?',
  '술 취하면 제일 위험한 사람?',
  '10년 뒤 제일 성공할 것 같은 사람?',
]

export default function LobbyQuestions({ roomId, me }) {
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
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-lg">📝 질문 미리 적기</h3>
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{list.length}개 모임</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
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

      {/* 아이디어 칩 — 빈 화면에서 뭘 적을지 막막할 때 */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {IDEAS.map((s) => (
          <button key={s} onClick={() => setText(s)} className="clay-inset px-2.5 py-1 text-xs" style={{ color: 'var(--ink-soft)' }}>{s}</button>
        ))}
      </div>

      {/* 쌓인 질문 목록 (최신순) */}
      <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
        {ordered.map((q) => {
          const mine = q.byId && me?.id && q.byId === me.id
          return (
            <div key={q.id} className="clay-inset flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>{q.text}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--ink-soft)' }}>{q.by}</span>
              {mine && (
                <button onClick={() => removeQuestion(roomId, q.id)} className="text-xs shrink-0" style={{ color: 'var(--c-coral)' }} title="내 질문 삭제">✕</button>
              )}
            </div>
          )
        })}
        {!ordered.length && <p className="text-center text-sm py-4" style={{ color: 'var(--ink-soft)' }}>아직 없어요 — 첫 질문을 남겨보세요! ✍️</p>}
      </div>
    </div>
  )
}
