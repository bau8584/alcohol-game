import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { checkHostPin } from '../lib/actions'
import HostConsole from '../components/HostConsole'
import RoomPanel from '../components/RoomPanel'
import SettingsMenu from '../components/SettingsMenu'
import JoinQR from '../components/JoinQR'
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
  const [qrOpen, setQrOpen] = useState(false)
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* 슬림 상단 바 — 방 식별 + ⋮ 설정(방코드·QR·테마·19금·초기화·테스트) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BackButton />
          <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>방 <b className="font-display text-lg tracking-widest" style={{ color: 'var(--ink)' }}>{roomId}</b></span>
        </div>
        <SettingsMenu roomId={roomId} meta={meta} players={players} onShowQR={() => setQrOpen(true)} />
      </div>

      {/* 게임 전 온보딩 — 사람 모으기 / 게임 고르기 */}
      {!game && (
        <Card>
          <div className="font-display text-lg mb-2">🚀 진행 순서</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => setQrOpen(true)} className="clay-inset p-3 text-left flex items-start gap-3">
              <span className="w-7 h-7 rounded-full font-display flex items-center justify-center shrink-0" style={{ background: 'var(--c-mint)', color: '#fff' }}>1</span>
              <div>
                <div className="font-bold">📱 사람들 모으기</div>
                <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>여기 눌러 참가 QR 띄우기 · 현재 <b>{players.length}명</b> 접속</div>
              </div>
            </button>
            <div className="clay-inset p-3 text-left flex items-start gap-3">
              <span className="w-7 h-7 rounded-full font-display flex items-center justify-center shrink-0" style={{ background: 'var(--c-grape)', color: '#fff' }}>2</span>
              <div>
                <div className="font-bold">🎮 게임 고르기</div>
                <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>아래에서 선택 · 처음이면 <b style={{ color: 'var(--c-mint)' }}>맨 위 추천 게임</b>부터, <b>❓</b>로 규칙 확인</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 주인공: 게임 선택/진행 — 최상단 */}
      <HostConsole roomId={roomId} meta={meta} players={players} teams={teams} />

      {/* 부수: 팀 점수·참가자·팀 설정 — 접이식(게임 전엔 펼침, 게임 시작하면 접힘) */}
      <RoomPanel key={game ? 'ingame' : 'lobby'} roomId={roomId} teams={teams} players={players} game={game} defaultOpen={!game} />

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setQrOpen(false)}>
          <div className="clay p-6 text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl mb-1">📱 스캔해서 참가!</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>카메라로 QR을 비추거나, 코드 <b className="tracking-widest">{roomId}</b> 입력</p>
            <div className="flex justify-center"><JoinQR url={joinUrl} size={280} /></div>
            <div className="mt-3 font-display text-lg break-all">{joinUrl}</div>
            <Button variant="ghost" className="mt-4" onClick={() => setQrOpen(false)}>닫기</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}

