import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { checkHostPin, resetRoom, clearSeeds, setPlayerTeam, setPlayerNickname, kickPlayer, setAdultEnabled } from '../lib/actions'
import { hasAdultConsent, setAdultConsent } from '../lib/adult'
import Scoreboard from '../components/Scoreboard'
import TeamSettings from '../components/TeamSettings'
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
          <AdultToggle roomId={roomId} enabled={!!meta.adultEnabled} />
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

// 19금(성인) 콘텐츠 토글 — 기본 OFF. 켤 때 최초 1회 '만 19세 이상' 자가확인 게이트.
function AdultToggle({ roomId, enabled }) {
  const [ask, setAsk] = useState(false)
  const turnOn = () => { if (hasAdultConsent()) setAdultEnabled(roomId, true); else setAsk(true) }
  const confirmAdult = () => { setAdultConsent(true); setAdultEnabled(roomId, true); setAsk(false) }
  return (
    <>
      <button
        onClick={() => (enabled ? setAdultEnabled(roomId, false) : turnOn())}
        className="clay-btn font-display px-3 py-2 text-base"
        style={enabled ? { background: '#e64545', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
        title="19금(성인) 콘텐츠 허용 여부 · 진행자만 · 기본 꺼짐"
      >
        🔞 19금 {enabled ? 'ON' : 'OFF'}
      </button>
      {ask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setAsk(false)}>
          <div className="clay p-5 w-full max-w-sm text-center" style={{ background: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">🔞</div>
            <h3 className="font-display text-xl mt-2">성인 콘텐츠 확인</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              19금 콘텐츠는 <b>만 19세 이상</b> 대상입니다.<br />본인 및 참가자가 만 19세 이상이며 성인 콘텐츠 이용에 동의하십니까?
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" style={{ background: '#e64545', color: '#fff' }} onClick={confirmAdult}>예, 만 19세 이상</Button>
              <Button variant="ghost" className="flex-1" onClick={() => setAsk(false)}>아니오</Button>
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>확인은 이 기기에 기억됩니다. 진행자 책임 하에 사용하세요.</p>
          </div>
        </div>
      )}
    </>
  )
}

// 참가자 관리: 닉네임 변경 + 팀 재배정 + 강퇴 (접었다 펴기). 게임 중에도 항상 접근 가능.
function PlayerManager({ roomId, players, teams }) {
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

