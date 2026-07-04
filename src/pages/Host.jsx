import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { GAMES, gameById } from '../games/registry'
import { checkHostPin, startGame, setRoundStatus, setPrompt, newRound, endGame, resetRoom, playBase } from '../lib/actions'
import Scoreboard from '../components/Scoreboard'
import AwardPanel from '../components/AwardPanel'
import ThemeSwitcher from '../components/ThemeSwitcher'
import BackButton from '../components/BackButton'
import { Button, Card, PhaseTag, TeamBadge } from '../components/ui'

function PinGate({ roomId, onOk }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const verify = async () => {
    if (await checkHostPin(roomId, pin)) {
      localStorage.setItem(`agw.host.${roomId}`, '1')
      onOk()
    } else setErr('PIN이 달라요')
  }
  return (
    <div className="min-h-full flex items-center justify-center p-6 relative">
      <BackButton className="absolute top-4 left-4" />
      <Card className="w-full max-w-sm text-center">
        <h2 className="font-display text-2xl mb-3">호스트 인증 · {roomId}</h2>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="호스트 PIN" className="clay-inset w-full px-4 py-3 text-center mb-3" onKeyDown={(e) => e.key === 'Enter' && verify()} />
        <Button className="w-full" onClick={verify}>입장</Button>
        {err && <p className="mt-2 font-bold" style={{ color: 'var(--c-coral)' }}>{err}</p>}
      </Card>
    </div>
  )
}

export default function Host() {
  const { roomId } = useParams()
  const [authed, setAuthed] = useState(() => localStorage.getItem(`agw.host.${roomId}`) === '1')
  const { loading, exists, meta, players, teams } = useRoom(roomId)
  const [prompt, setPromptLocal] = useState('')
  const game = meta?.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null

  useEffect(() => {
    setPromptLocal(meta?.prompt || '')
  }, [meta?.activeGameId, meta?.roundSeq]) // eslint-disable-line

  if (!authed) return <PinGate roomId={roomId} onOk={() => setAuthed(true)} />
  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>존재하지 않는 방입니다.</Center>

  const joinUrl = `${location.origin}/play/${roomId}`
  const writePrompt = (v) => {
    setPromptLocal(v)
    setPrompt(roomId, v)
  }
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
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <Scoreboard teams={teams} />

      {!game ? (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">🎮 게임 선택</h2>
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>접속 {players.length}명</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GAMES.map((g) => (
              <button key={g.id} onClick={() => startGame(roomId, g.id)} disabled={!players.length} className="clay-btn p-4 text-left" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
                <div className="text-3xl">{g.emoji}</div>
                <div className="font-display text-lg mt-1">{g.name}</div>
                <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{g.tagline}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>접속자</div>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname} <TeamBadge teamId={p.teamId} /></span>))}
              {!players.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>아직 아무도 없어요.</span>}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl">{game.emoji} {game.name}</span>
                <PhaseTag status={meta.roundStatus} />
              </div>
              <Button variant="ghost" onClick={() => endGame(roomId)}>게임 목록</Button>
            </div>
            {game.promptLabel && (
              <input value={prompt} onChange={(e) => writePrompt(e.target.value)} placeholder={game.promptLabel} className="clay-inset w-full px-4 py-2.5 mb-3" />
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="ok" onClick={() => setRoundStatus(roomId, 'open')} disabled={meta.roundStatus === 'open'}>▶ 시작</Button>
              <Button variant="warn" onClick={() => setRoundStatus(roomId, 'reveal')}>👁 공개</Button>
              <Button variant="ghost" onClick={() => newRound(roomId)}>🔄 새 라운드</Button>
            </div>
            <div className="clay-inset p-4 min-h-[180px]">
              <game.HostView roomId={roomId} base={base} meta={meta} players={players} teams={teams} />
            </div>
          </Card>
          <AwardPanel roomId={roomId} players={players} teams={teams} />
        </>
      )}
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}
