import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { joinRoom, setPlayerTeam, leaveRoom, playBase, releaseHost, isPlayerOffline, reclaimRecord } from '../lib/actions'
import { ensurePlayerId, getSession, saveSession, clearSession } from '../lib/session'
import { markPresence, roomPath } from '../lib/db'
import HeartBar from '../components/HeartBar'
import LobbyQuestions from '../components/LobbyQuestions'
import GameCatalog from '../components/GameCatalog'
import HowToPlay from '../components/HowToPlay'
import SharedResult from '../components/SharedResult'
import HostConsole from '../components/HostConsole'
import RoomPanel from '../components/RoomPanel'
import SettingsMenu from '../components/SettingsMenu'
import PlayerMenu from '../components/PlayerMenu'
import JoinQR from '../components/JoinQR'
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
  const [reclaimId, setReclaimId] = useState(null) // 오프라인 유령 기록 이어받기 대상
  const [tab, setTab] = useState('play') // 진행자일 때만 사용: 'play' | 'host'
  const [qrOpen, setQrOpen] = useState(false)
  const me = players.find((p) => p.id === playerId)
  const myTeam = teams.find((t) => t.id === me?.teamId)

  // 완전히 나가기: 방에서 내 레코드 삭제 + 폰 저장 기록(playerId·닉네임) 삭제 → 다음 접속은 새 신원.
  // (B) 삭제가 확실히 반영된 뒤에만 신원을 지운다. 실패하면 신원 유지 → 재시도 시 같은 id로 재입장(유령 충돌 방지).
  const leaveAndReset = async () => {
    if (!confirm('방에서 나가고 이 폰의 접속 기록(닉네임)을 지울까요?\n다음에 다시 들어오면 닉네임부터 새로 정해요.')) return
    try {
      await leaveRoom(roomId, playerId)
    } catch {
      alert('나가기에 실패했어요(네트워크). 잠시 후 다시 시도해주세요.')
      return
    }
    clearSession()
    nav('/')
  }
  // 저장된 신원만 초기화(레코드는 없는 상태) 후 새로고침 → 새 playerId·빈 닉네임
  const clearStoredIdentity = () => {
    clearSession()
    location.reload()
  }

  useEffect(() => {
    if (!me) return
    const unsub = markPresence(roomPath(roomId, `presence/${playerId}`), true, false)
    return unsub
  }, [!!me, roomId, playerId])

  // 진행자+참가자 모드 탭 자동 전환:
  //  · 라운드가 실제 시작(roundStatus→'open')되면 → '내 플레이'로 (즉각 참여)
  //    'open'을 쓰는 게임에만 걸린다. 연타·치킨·줄줄이는 자체 시작에서 'open'을 쏘도록 맞춰뒀고,
  //    카드·판정을 계속 잡아야 하는 자체 진행형(몸으로·이어말하기·너이름이·왕게임 등)은 진행 탭 유지.
  //  · 게임이 끝나 목록으로 나오면(activeGameId 사라짐) → '진행'으로 (다음 게임 고르기 루프)
  const prevStatusRef = useRef(meta?.roundStatus)
  const prevGameRef = useRef(meta?.activeGameId)
  useEffect(() => {
    const iAmHostNow = !!meta?.hostPlayerId && meta.hostPlayerId === playerId
    if (iAmHostNow) {
      if (meta?.roundStatus === 'open' && prevStatusRef.current !== 'open') setTab('play')
      else if (!meta?.activeGameId && prevGameRef.current) setTab('host')
    }
    prevStatusRef.current = meta?.roundStatus
    prevGameRef.current = meta?.activeGameId
  }, [meta?.roundStatus, meta?.activeGameId, meta?.hostPlayerId, playerId])

  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>방 코드 {roomId}를 찾을 수 없어요.</Center>

  // 1) 닉네임 입장
  if (!me) {
    const submit = async () => {
      const n = nick.trim()
      if (!n || joining) return
      setJoining(true)
      setJoinErr('')
      setReclaimId(null)
      try {
        await joinRoom(roomId, playerId, n)
        saveSession({ nickname: n, roomId })
      } catch (e) {
        if (e.code === 'DUP_NICK') {
          // (A) 그 닉네임을 오프라인 유령만 점유 중이면 → 이어받기 제안
          const offline = e.holderId ? await isPlayerOffline(roomId, e.holderId).catch(() => false) : false
          if (offline) {
            setReclaimId(e.holderId)
            setJoinErr('')
          } else {
            setJoinErr('이미 사용 중인 닉네임이에요. 다른 닉네임을 써주세요.')
          }
        } else {
          setJoinErr('입장 실패: ' + e.message)
        }
        setJoining(false)
      }
    }
    // (C) 오프라인 유령 기록을 이어받아 입장 — 옛 신원(점수·팀)을 그대로 승계
    const doReclaim = async () => {
      const n = nick.trim()
      try {
        await reclaimRecord(roomId, reclaimId, n)
        saveSession({ playerId: reclaimId, nickname: n, roomId })
        location.reload()
      } catch (e) {
        setJoinErr('이어받기 실패: ' + e.message)
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
          {reclaimId && (
            <div className="mt-3 clay-inset p-3 text-sm">
              <p className="mb-2">이 닉네임을 쓰던 사람이 <b>지금 접속이 끊긴 상태</b>예요. 예전의 나였나요?</p>
              <Button className="w-full" onClick={doReclaim}>✅ 이 닉네임은 나예요 · 이어서 입장 (점수·팀 유지)</Button>
              <button onClick={() => { setReclaimId(null); setJoinErr('다른 닉네임을 써주세요.') }} className="mt-2 text-xs underline" style={{ color: 'var(--ink-soft)' }}>
                아니에요, 다른 닉네임 쓸게요
              </button>
            </div>
          )}
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
          <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>고민되면 아래 <b>아무 팀이나</b>를 누르세요. 진행자가 나중에 조정할 수 있어요.</p>
          <div className="grid gap-3">
            {teams.map((t) => (
              <button key={t.id} onClick={() => setPlayerTeam(roomId, playerId, t.id)} className="clay-btn py-4 font-display text-xl" style={{ background: t.color, color: '#fff' }}>
                {t.name} <span className="opacity-80 text-base">({t.members.length}명)</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const smallest = [...teams].sort((a, b) => a.members.length - b.members.length)[0]
              if (smallest) setPlayerTeam(roomId, playerId, smallest.id)
            }}
            className="clay-btn w-full mt-3 py-3 font-display"
            style={{ background: 'var(--c-grape)', color: '#fff' }}
          >
            🎲 아무 팀이나 (자동 배정)
          </button>
          <button onClick={leaveAndReset} className="mt-4 text-xs underline" style={{ color: 'var(--ink-soft)' }}>내가 아니에요 · 나가서 기록 지우기</button>
        </Card>
      </Center>
    )
  }

  // 3) 게임
  const game = meta.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null
  const iAmHost = !!meta.hostPlayerId && meta.hostPlayerId === playerId
  const onHostTab = iAmHost && tab === 'host'
  return (
    <div className={`min-h-full p-4 mx-auto space-y-3 ${onHostTab ? 'max-w-3xl' : 'max-w-md'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BackButton label="" />
          <HeartBar hearts={me.hearts || 0} />
          <div className="font-display text-lg truncate">{me.nickname} <span className="text-sm" style={{ color: myTeam?.color }}>{myTeam?.name}</span></div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game && <PhaseTag status={meta.roundStatus} />}
          {iAmHost ? (
            <SettingsMenu roomId={roomId} meta={meta} players={players} onShowQR={() => setQrOpen(true)} />
          ) : (
            <PlayerMenu roomId={roomId} playerId={playerId} onShowQR={() => setQrOpen(true)} onLeave={leaveAndReset} />
          )}
        </div>
      </div>

      {/* 진행자도 참가자 모드: 내 플레이 ↔ 진행 탭 */}
      {iAmHost && (
        <div className="flex gap-2">
          {[
            { id: 'play', label: '🎮 내 플레이' },
            { id: 'host', label: '🖥 진행' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="clay-btn flex-1 py-2.5 font-display"
              style={tab === t.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {onHostTab ? (
        <>
          <HostConsole roomId={roomId} meta={meta} players={players} teams={teams} compact />
          <RoomPanel key={game ? 'ingame' : 'lobby'} roomId={roomId} teams={teams} players={players} game={game} defaultOpen={!game} />
          <button
            onClick={async () => { if (confirm('진행자 권한을 내려놓을까요?')) { await releaseHost(roomId, playerId); setTab('play') } }}
            className="w-full text-xs underline py-2"
            style={{ color: 'var(--ink-soft)' }}
          >
            진행자 내려놓기
          </button>
        </>
      ) : (
        <>
          <TeamScores teams={teams} myTeamId={myTeam?.id} />
          <div className="pt-2">
            {game && base ? (
              <game.PlayerView roomId={roomId} base={base} meta={meta} players={players} teams={teams} me={me} myTeam={myTeam} />
            ) : (
              <div className="space-y-3">
                <div className="text-center py-4" style={{ color: 'var(--ink-soft)' }}>
                  <div className="text-4xl mb-2 animate-pulse">⏳</div>
                  진행자가 게임을 고르는 중…
                  <div className="mt-1 text-sm">{iAmHost ? '🖥 진행 탭에서 게임을 고르세요!' : '기다리는 동안 구경하고 질문도 적어봐요 👇'}</div>
                </div>
                <GameCatalog defaultOpen />
                <LobbyQuestions roomId={roomId} me={me} adult={!!meta.adultEnabled} defaultOpen />
              </div>
            )}
          </div>
          {/* 결과 화면: 공개되면 자동으로 펼쳐지고, 토글로 언제든 여닫기 — 호스트 화면 없이도 결과 확인 */}
          {game && base && game.shareResult !== false && <SharedResult key={`res-${game.id}`} game={game} roomId={roomId} base={base} meta={meta} players={players} teams={teams} />}
          {/* 규칙은 게임 화면 아래에, 기본은 접힌 상태 — 게임 진행을 가리지 않도록 */}
          {game && base && <HowToPlay key={game.id} gameId={game.id} emoji={game.emoji} name={game.name} defaultOpen={false} />}
        </>
      )}

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setQrOpen(false)}>
          <div className="clay p-6 text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl mb-1">📱 스캔해서 참가!</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>카메라로 QR을 비추거나, 코드 <b className="tracking-widest">{roomId}</b> 입력</p>
            <div className="flex justify-center"><JoinQR url={`${location.origin}/play/${roomId}`} size={280} /></div>
            <div className="mt-3 font-display text-lg break-all">{location.origin}/play/{roomId}</div>
            <Button variant="ghost" className="mt-4" onClick={() => setQrOpen(false)}>닫기</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 참가자용 팀 점수 스트립 (읽기 전용) — 순위 메달 + 내 팀 강조
const MEDALS = ['🥇', '🥈', '🥉']
function TeamScores({ teams, myTeamId }) {
  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const rankOf = (t) => teams.filter((x) => x.score > t.score).length
  return (
    <div className="clay p-2 flex flex-wrap items-center justify-center gap-1.5" style={{ background: 'var(--surface)' }}>
      <span className="text-xs font-bold px-1" style={{ color: 'var(--ink-soft)' }}>🏆 팀 점수</span>
      {ranked.map((t) => {
        const medal = t.score > 0 ? MEDALS[rankOf(t)] : null
        const mine = t.id === myTeamId
        return (
          <span
            key={t.id}
            className="px-2.5 py-1 rounded-xl text-sm font-bold flex items-center gap-1"
            style={mine ? { background: t.color, color: '#fff' } : { background: 'var(--surface-2)' }}
          >
            {medal && <span>{medal}</span>}
            <span style={{ color: mine ? '#fff' : t.color }}>{t.name}</span>
            <span className="tabular-nums" style={{ color: mine ? '#fff' : 'var(--ink)' }}>{t.score}점</span>
          </span>
        )
      })}
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center p-6 relative" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}
