// 참가자 관리: 닉네임 변경 + 팀 재배정 + 강퇴 (접었다 펴기). 게임 중에도 항상 접근 가능.
// /host 큰 화면과 '진행자도 참가자' 모드의 폰 진행 탭에서 공용으로 쓴다.
import { useState } from 'react'
import { setPlayerTeam, setPlayerNickname, kickPlayer } from '../lib/actions'
import { Card } from './ui'

export default function PlayerManager({ roomId, players, teams }) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const startEdit = (p) => { setEditId(p.id); setName(p.nickname) }
  const saveEdit = async () => {
    const n = name.trim()
    if (!n) return setEditId(null)
    try { await setPlayerNickname(roomId, editId, n); setEditId(null) }
    catch (e) { alert(e.message) }
  }
  return (
    <Card>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <span className="font-display text-xl">👥 참가자 관리 <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({players.length}명)</span></span>
        <span style={{ color: 'var(--ink-soft)' }}>{open ? '▲ 접기' : '▼ 이름변경·팀변경·강퇴'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {players.map((p) => (
            <div key={p.id} className="clay-inset p-2 flex flex-wrap items-center gap-2">
              {editId === p.id ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 12))}
                    autoFocus
                    className="clay-inset px-2 py-1 flex-1 min-w-[120px] text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }}
                  />
                  <button onClick={saveEdit} className="clay-btn px-2.5 py-1 text-sm" style={{ background: 'var(--c-mint)', color: '#fff' }}>저장</button>
                  <button onClick={() => setEditId(null)} className="clay-btn px-2.5 py-1 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>취소</button>
                </>
              ) : (
                <>
                  <span className="font-bold flex-1 min-w-[70px] truncate">
                    {p.nickname}
                    {p.seed && <span className="ml-1 text-xs" style={{ color: 'var(--ink-soft)' }}>(테스트)</span>}
                  </span>
                  <button
                    onClick={() => startEdit(p)}
                    className="clay-btn px-2.5 py-1 text-sm"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                    title="닉네임 변경"
                  >
                    ✏️
                  </button>
                  <div className="flex gap-1">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setPlayerTeam(roomId, p.id, t.id)}
                        className="clay-btn px-2.5 py-1 text-sm"
                        style={p.teamId === t.id ? { background: t.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                        title={`${t.name} 팀으로`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (confirm(`${p.nickname} 님을 강퇴할까요?\n(그 사람 폰은 입장 화면으로 돌아가고, 다시 들어올 수 있어요)`)) kickPlayer(roomId, p.id) }}
                    className="clay-btn px-2.5 py-1 text-sm"
                    style={{ background: 'var(--c-coral)', color: '#fff' }}
                  >
                    강퇴
                  </button>
                </>
              )}
            </div>
          ))}
          {!players.length && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>아직 아무도 없어요.</p>}
        </div>
      )}
    </Card>
  )
}
