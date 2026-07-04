import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { joinRoom, setPlayerTeam, leaveRoom, playBase } from '../lib/actions'
import { ensurePlayerId, getSession, saveSession, clearSession } from '../lib/session'
import { markPresence, roomPath } from '../lib/db'
import ItemBar from '../components/ItemBar'
import ThemeSwitcher from '../components/ThemeSwitcher'
import BackButton from '../components/BackButton'
import { Button, Card, PhaseTag } from '../components/ui'

export default function Player() {
  const { roomId } = useParams()
  const nav = useNavigate()
  const [playerId] = useState(ensurePlayerId)
  const { loading, exists, meta, players, teams } = useRoom(roomId)
  const [nick, setNick] = useState(getSession().nickname || '')
  const [joinErr, setJoinErr] = useState('')
  const [joining, setJoining] = useState(false)
  const me = players.find((p) => p.id === playerId)
  const myTeam = teams.find((t) => t.id === me?.teamId)

  // 완전히 나가기: 방에서 내 레코드 삭제 + 폰 저장 기록(playerId·닉네임) 삭제 → 다음 접속은 새 신원.
  const leaveAndReset = async () => {
    if (!confirm('방에서 나가고 이 폰의 접속 기록(닉네임)을 지울까요?\n다음에 다시 들어오면 닉네임부터 새로 정해요.')) return
    try { await leaveRoom(roomId, playerId) } catch { /* 레코드가 이미 없어도 무시 */ }
    clearSession()
    nav('/')
  }
  // 저장된 신원만 초기화(레코드는 없는 상태) 후 새로고침 → 새 playerId·빈 닉네임
  const clearStoredIdentity = () => {
    clearSession()
    location.reload()
  }

  useEffect(() => {
    if (me) markPresence(roomPath(roomId, `players/${playerId}/connected`), true, false)
  }, [!!me, roomId, playerId])

  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>방 코드 {roomId}를 찾을 수 없어요.</Center>

  // 1) 닉네임 입장
  if (!me) {
    const submit = async () => {
      const n = nick.trim()
      if (!n || joining) return
      setJoining(true)
      setJoinErr('')
      try {
        await joinRoom(roomId, playerId, n)
        saveSession({ nickname: n, roomId })
      } catch (e) {
        setJoinErr(e.code === 'DUP_NICK' ? '이미 사용 중인 닉네임이에요. 다른 닉네임을 써주세요.' : '입장 실패: ' + e.message)
        setJoining(false)
      }
    }
    return (
      <Center>
        <BackButton className="absolute top-4 left-4" />
        <Card className="w-full max-w-sm text-center">
          <div className="text-5xl mb-1">🍻</div>
          <h2 className="font-display text-2xl mb-3">방 {roomId} 입장</h2>
          <input value={nick} onChange={(e) => { setNick(e.target.value.slice(0, 12)); setJoinErr('') }} placeholder="닉네임" className="clay-inset w-full px-4 py-3 text-center text-lg mb-3" onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <Button className="w-full" onClick={submit} disabled={joining}>{joining ? '입장 중…' : '입장'}</Button>
          {joinErr && <p className="mt-3 font-bold" style={{ color: 'var(--c-coral)' }}>{joinErr}</p>}
          {getSession().playerId && (
            <button onClick={clearStoredIdentity} className="mt-3 text-xs underline" style={{ color: 'var(--ink-soft)' }}>
              이전 접속 기록 지우고 새로 시작
            </button>
          )}
        </Card>
      </Center>
    )
  }

  // 2) 팀 선택
  if (!me.teamId) {
    return (
      <Center>
        <BackButton className="absolute top-4 left-4" />
        <Card className="w-full max-w-sm text-center">
          <h2 className="font-display text-xl mb-1">{me.nickname} 님, 팀 선택!</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>진행자가 나중에 조정할 수 있어요.</p>
          <div className="grid gap-3">
            {teams.map((t) => (
              <button key={t.id} onClick={() => setPlayerTeam(roomId, playerId, t.id)} className="clay-btn py-4 font-display text-xl" style={{ background: t.color, color: '#fff' }}>
                {t.name} <span className="opacity-80 text-base">({t.members.length}명)</span>
              </button>
            ))}
          </div>
          <button onClick={leaveAndReset} className="mt-4 text-xs underline" style={{ color: 'var(--ink-soft)' }}>내가 아니에요 · 나가서 기록 지우기</button>
        </Card>
      </Center>
    )
  }

  // 3) 게임
  const game = meta.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null
  return (
    <div className="min-h-full p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BackButton label="" />
          <div className="font-display text-lg truncate">{me.nickname} <span className="text-sm" style={{ color: myTeam?.color }}>{myTeam?.name}</span></div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game && <PhaseTag status={meta.roundStatus} />}
          <button onClick={leaveAndReset} className="clay px-2.5 py-2 text-sm font-bold" style={{ background: 'var(--surface)', color: 'var(--ink)' }} title="나가기 · 접속 기록 지우기">🚪</button>
          <ThemeSwitcher />
        </div>
      </div>
      <ItemBar me={me} team={myTeam} />
      <div className="pt-2">
        {game && base ? (
          <game.PlayerView roomId={roomId} base={base} meta={meta} players={players} teams={teams} me={me} myTeam={myTeam} />
        ) : (
          <div className="text-center py-16" style={{ color: 'var(--ink-soft)' }}>
            <div className="text-5xl mb-3 animate-pulse">⏳</div>
            진행자가 게임을 고르는 중…
            <div className="mt-1 text-sm">메인 화면을 봐주세요!</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center p-6 relative" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}
