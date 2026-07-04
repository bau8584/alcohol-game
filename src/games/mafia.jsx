// 6. 시크릿 시그널 — 밤엔 마피아만 익명 채팅, 일반인은 암전.
import { useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList } from '../lib/db'
import { Button } from '../components/ui'

const aliasOf = (ids, myId) => {
  const list = Object.keys(ids || {}).sort()
  const i = list.indexOf(myId)
  return i < 0 ? null : '마피아 ' + String.fromCharCode(65 + i)
}

function HostView({ base, players }) {
  const setup = useValue(`${base}/setup`)
  const night = useValue(`${base}/night`)
  const chat = toList(useValue(`${base}/chat`)).sort((a, b) => (a.ts || 0) - (b.ts || 0))
  const [count, setCount] = useState(3)

  const assign = () => {
    if (players.length < count + 1) return alert('인원이 부족합니다.')
    const s = [...players]
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[s[i], s[j]] = [s[j], s[i]]
    }
    const mafiaIds = s.slice(0, count).reduce((a, p) => ((a[p.id] = true), a), {})
    dbUpdate(base, { setup: { mafiaIds, at: Date.now() }, night: false, chat: null })
  }

  const mafiaNames = setup ? players.filter((p) => setup.mafiaIds?.[p.id]).map((p) => p.nickname) : []

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-white/60">마피아 수</span>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`w-9 h-9 rounded-lg font-bold ${count === n ? 'bg-rose-500' : 'bg-white/10'}`}
          >
            {n}
          </button>
        ))}
        <Button variant="danger" onClick={assign}>
          마피아 지정
        </Button>
      </div>
      {setup && (
        <div className="mt-4">
          <Button variant={night ? 'warn' : 'ghost'} onClick={() => dbSet(`${base}/night`, !night)}>
            {night ? '☀️ 낮으로 전환' : '🌙 밤 시작 (암전)'}
          </Button>
          <p className="mt-3 text-rose-400 font-bold">🕵️ 마피아: {mafiaNames.join(', ')}</p>
          <div className="mt-3 mx-auto max-w-md text-left rounded-xl bg-black/40 p-3 h-40 overflow-y-auto">
            <div className="text-xs text-white/40 mb-1">마피아 채팅 모니터</div>
            {chat.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="text-rose-300 font-bold">{m.alias}</span>: {m.text}
              </div>
            ))}
            {!chat.length && <div className="text-white/30 text-sm">아직 메시지 없음</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const setup = useValue(`${base}/setup`)
  const night = useValue(`${base}/night`)
  const chatRaw = useValue(`${base}/chat`)
  const [text, setText] = useState(false) // false=역할 숨김
  const [msg, setMsg] = useState('')

  if (!setup) return <p className="text-center text-white/50">역할 배분 대기 중… 🤫</p>
  const amMafia = !!setup.mafiaIds?.[me.id]
  const alias = aliasOf(setup.mafiaIds, me.id)
  const chat = toList(chatRaw).sort((a, b) => (a.ts || 0) - (b.ts || 0))

  const send = () => {
    if (!msg.trim()) return
    dbPush(`${base}/chat`, { alias, text: msg.trim(), ts: Date.now() })
    setMsg('')
  }

  // 밤: 일반인 암전
  if (night && !amMafia) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white/30 text-2xl">
        🌙 밤… 눈을 감으세요
      </div>
    )
  }

  // 밤: 마피아 익명 채팅
  if (night && amMafia) {
    return (
      <div className="fixed inset-0 bg-black p-4 flex flex-col">
        <div className="text-rose-400 font-bold">🕵️ {alias} · 마피아 채팅</div>
        <div className="flex-1 overflow-y-auto my-2 space-y-1">
          {chat.map((m) => (
            <div key={m.id} className={`text-sm ${m.alias === alias ? 'text-right' : ''}`}>
              <span className="text-rose-300 font-bold">{m.alias}</span> {m.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="flex-1 rounded-xl bg-white/10 px-3 py-3 outline-none"
            placeholder="익명 지령…"
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <Button variant="danger" onClick={send}>
            전송
          </Button>
        </div>
      </div>
    )
  }

  // 낮: 역할 확인
  return (
    <div className="text-center">
      {!text ? (
        <Button className="w-full py-6" variant="ghost" onClick={() => setText(true)}>
          👆 내 정체 확인
        </Button>
      ) : (
        <div
          className={`rounded-2xl p-8 ${amMafia ? 'bg-rose-600/30 border border-rose-400' : 'bg-sky-600/20 border border-sky-400'}`}
        >
          <div className="text-4xl font-black">{amMafia ? '🕵️ 마피아' : '😇 시민'}</div>
          <p className="mt-2 text-white/70">
            {amMafia ? '밤이 되면 동료와 익명 채팅이 열립니다.' : '밤엔 화면이 암전됩니다.'}
          </p>
          <button className="mt-4 text-sm text-white/40 underline" onClick={() => setText(false)}>
            가리기
          </button>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'mafia',
  name: '시크릿 시그널',
  emoji: '🕵️',
  tagline: '암전 + 마피아 전용 익명 채팅',
  promptLabel: '상황 설명 (선택)',
  HostView,
  PlayerView,
}
