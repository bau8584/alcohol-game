import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { checkHostPin, resetRoom, clearSeeds } from '../lib/actions'
import Scoreboard from '../components/Scoreboard'
import TeamSettings from '../components/TeamSettings'
import PlayerManager from '../components/PlayerManager'
import HostConsole from '../components/HostConsole'
import ThemeSwitcher from '../components/ThemeSwitcher'
import BackButton from '../components/BackButton'
import { Button, Card } from '../components/ui'

const HOST_KEY = (roomId) => `agw.host.${roomId}`

function PinGate({ roomId, onOk }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const verify = async () => {
    if (await checkHostPin(roomId, pin)) onOk(pin)
    else setErr('PIN이 달라요')
  }
  return (
    <div className="min-h-full flex items-center justify-center p-6 relative">
      <BackButton className="absolute top-4 left-4" />
      <Card className="w-full max-w-sm text-center">
        <h2 className="font-display text-2xl mb-1">호스트 인증 · {roomId}</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>참가자라면 아래 ‘참가자로 입장’을 누르세요</p>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="호스트 PIN" className="clay-inset w-full px-4 py-3 text-center mb-3" onKeyDown={(e) => e.key === 'Enter' && verify()} />
        <Button className="w-full" onClick={verify}>🖥️ 호스트 입장</Button>
        {err && <p className="mt-2 font-bold" style={{ color: 'var(--c-coral)' }}>{err}</p>}
        <a href={`/play/${roomId}`} className="clay-btn font-display block w-full mt-4 py-3 text-lg" style={{ background: 'var(--c-mint)', color: '#fff' }}>🙋 참가자로 입장</a>
      </Card>
    </div>
  )
}

export default function Host() {
  const { roomId } = useParams()
  const [authed, setAuthed] = useState(false)
  // 저장된 값이 있으면 '검증 중', 없으면 곧장 PIN 화면
  const [checking, setChecking] = useState(() => !!localStorage.getItem(HOST_KEY(roomId)))
  const { loading, exists, meta, players, teams } = useRoom(roomId)
  const game = meta?.activeGameId ? gameById(meta.activeGameId) : null

  // 저장된 PIN을 DB와 대조해서만 자동 인증. 단순 플래그/낡은 값으로는 통과 못 함(참가자 오입장 방지).
  useEffect(() => {
    const stored = localStorage.getItem(HOST_KEY(roomId))
    if (!stored) { setChecking(false); return }
    let alive = true
    ;(async () => {
      const ok = await checkHostPin(roomId, stored)
      if (!alive) return
      if (ok) setAuthed(true)
      else localStorage.removeItem(HOST_KEY(roomId)) // 낡은/잘못된 값 제거 → PIN 화면
      setChecking(false)
    })()
    return () => { alive = false }
  }, [roomId])

  if (checking) return <Center>확인 중…</Center>
  if (!authed) return <PinGate roomId={roomId} onOk={(pin) => { localStorage.setItem(HOST_KEY(roomId), pin); setAuthed(true) }} />
  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>존재하지 않는 방입니다.</Center>

  const joinUrl = `${location.origin}/play/${roomId}`
  const doReset = () => {
    if (confirm('참가자·점수·재화·진행상태를 모두 지우고 처음 상태로 초기화할까요?')) resetRoom(roomId)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <span style={{ color: 'var(--ink-soft)' }}>방 코드 </span>
            <span className="font-display text-3xl tracking-widest">{roomId}</span>
            <span className="ml-3 text-sm" style={{ color: 'var(--ink-soft)' }}>참가: {joinUrl}</span>
            <span className="ml-3 text-sm" style={{ color: 'var(--ink-soft)' }}>📺 화면: {location.origin}/tv/{roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {players.some((p) => p.seed) && (
            <button
              onClick={() => clearSeeds(roomId)}
              className="clay-btn font-display px-3 py-2 text-base"
              style={{ background: 'var(--c-grape)', color: '#fff' }}
              title="테스트로 시드된 가짜 참가자만 제거 (실제 참가자는 유지)"
            >
              🧪 테스트 명단 지우기
            </button>
          )}
          <button
            onClick={doReset}
            className="clay-btn font-display px-3 py-2 text-base"
            style={{ background: 'var(--c-coral)', color: '#fff' }}
          >
            🧹 초기화
          </button>
          <ThemeSwitcher />
        </div>
      </div>

      <Scoreboard roomId={roomId} teams={teams} />

      {!game && <TeamSettings roomId={roomId} teams={teams} />}

      <PlayerManager roomId={roomId} players={players} teams={teams} />

      <HostConsole roomId={roomId} meta={meta} players={players} teams={teams} />
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}

