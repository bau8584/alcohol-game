import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { GAMES, gameById } from '../games/registry'
import {
  checkHostPin,
  startGame,
  setRoundStatus,
  setPrompt,
  newRound,
  endGame,
  playBase,
} from '../lib/actions'
import Scoreboard from '../components/Scoreboard'
import AwardPanel from '../components/AwardPanel'
import { Button, Card, PhaseTag, TeamBadge } from '../components/ui'

function PinGate({ roomId, onOk }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const verify = async () => {
    if (await checkHostPin(roomId, pin)) {
      localStorage.setItem(`agw.host.${roomId}`, '1')
      onOk()
    } else setErr('PIN 불일치')
  }
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <h2 className="text-xl font-black mb-3">호스트 인증 · 방 {roomId}</h2>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="호스트 PIN"
          className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none mb-3 text-center"
          onKeyDown={(e) => e.key === 'Enter' && verify()}
        />
        <Button className="w-full" onClick={verify}>
          입장
        </Button>
        {err && <p className="mt-2 text-rose-400">{err}</p>}
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

  // 게임/라운드 전환 시 프롬프트 입력 동기화
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-white/50">방 코드 </span>
          <span className="text-3xl font-black tracking-widest">{roomId}</span>
        </div>
        <div className="text-sm text-white/50">
          참가 링크: <span className="text-white/80">{joinUrl}</span>
        </div>
      </div>

      <Scoreboard teams={teams} />

      {!game ? (
        // ── 로비: 게임 선택 ──
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black">🎮 게임 선택</h2>
            <span className="text-white/50 text-sm">접속 {players.length}명</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => startGame(roomId, g.id)}
                disabled={!players.length}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left disabled:opacity-40"
              >
                <div className="text-2xl">{g.emoji}</div>
                <div className="font-black">{g.name}</div>
                <div className="text-xs text-white/50">{g.tagline}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="text-sm text-white/50 mb-1">접속자</div>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span key={p.id} className="rounded-lg bg-white/5 px-2 py-1 text-sm">
                  {p.nickname} <TeamBadge teamId={p.teamId} />
                </span>
              ))}
              {!players.length && <span className="text-white/40 text-sm">아직 아무도 접속하지 않았어요.</span>}
            </div>
          </div>
        </Card>
      ) : (
        // ── 진행 중 ──
        <>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">
                  {game.emoji} {game.name}
                </span>
                <PhaseTag status={meta.roundStatus} />
              </div>
              <Button variant="ghost" onClick={() => endGame(roomId)}>
                게임 목록으로
              </Button>
            </div>

            {game.promptLabel && (
              <input
                value={prompt}
                onChange={(e) => writePrompt(e.target.value)}
                placeholder={game.promptLabel}
                className="w-full rounded-xl bg-white/10 px-4 py-2 outline-none mb-3"
              />
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="ok" onClick={() => setRoundStatus(roomId, 'open')} disabled={meta.roundStatus === 'open'}>
                ▶ 진행 시작
              </Button>
              <Button variant="warn" onClick={() => setRoundStatus(roomId, 'reveal')}>
                👁 결과 공개
              </Button>
              <Button variant="ghost" onClick={() => newRound(roomId)}>
                🔄 새 라운드
              </Button>
            </div>

            {/* 게임별 Host 화면 */}
            <div className="rounded-2xl bg-black/20 p-4 min-h-[180px]">
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
  return <div className="min-h-full flex items-center justify-center text-white/60">{children}</div>
}
