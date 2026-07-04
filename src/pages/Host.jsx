import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { GAMES, gameById, GENRES, TRAITS, genreById, traitById } from '../games/registry'
import { checkHostPin, startGame, setRoundStatus, setPrompt, newRound, endGame, resetRoom, playBase, clearSeeds, setPlayerTeam, setPlayerNickname, kickPlayer } from '../lib/actions'
import Scoreboard from '../components/Scoreboard'
import TeamSettings from '../components/TeamSettings'
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
  const [filter, setFilter] = useState(null) // { kind: 'genre'|'trait', id }
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

  // 게임이 선언한 컨트롤 (없으면 기본: 프롬프트·공개 모두 표시)
  const ctrl = game?.controls || {}
  const showPrompt = game?.promptLabel && ctrl.prompt !== false
  const showReveal = ctrl.reveal !== false
  const doNext = ctrl.resetArms
    ? async () => {
        await newRound(roomId) // 기록 지우고 새 라운드
        await setRoundStatus(roomId, 'open') // 즉시 재무장
      }
    : () => newRound(roomId)

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

      {!game ? (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">🎮 게임 선택</h2>
            <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>접속 {players.length}명</span>
          </div>
          {(() => {
            const matches = (g) => !filter || (filter.kind === 'genre' ? (g.genres || []).includes(filter.id) : (g.traits || []).includes(filter.id))
            const shown = GAMES.filter(matches)
            const chip = () => 'clay-btn px-3 py-1.5 text-sm whitespace-nowrap'
            const chipStyle = (active) => active ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }
            return (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setFilter(null)} className={chip()} style={chipStyle(!filter)}>전체 {GAMES.length}</button>
                  <span className="w-px self-stretch my-0.5" style={{ background: 'var(--ink-soft)', opacity: 0.3 }} />
                  {GENRES.map((t) => {
                    const active = filter?.kind === 'genre' && filter.id === t.id
                    return <button key={t.id} onClick={() => setFilter(active ? null : { kind: 'genre', id: t.id })} className={chip()} style={chipStyle(active)}>{t.emoji} {t.label}</button>
                  })}
                  <span className="w-px self-stretch my-0.5" style={{ background: 'var(--ink-soft)', opacity: 0.3 }} />
                  {TRAITS.map((t) => {
                    const active = filter?.kind === 'trait' && filter.id === t.id
                    return <button key={t.id} onClick={() => setFilter(active ? null : { kind: 'trait', id: t.id })} className={chip()} style={chipStyle(active)}>{t.emoji} {t.label}</button>
                  })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {shown.map((g) => (
                    <button key={g.id} onClick={() => startGame(roomId, g.id)} disabled={!players.length} className="clay-btn p-4 text-left" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
                      <div className="flex items-start justify-between">
                        <div className="text-3xl">{g.emoji}</div>
                        <div className="flex gap-1 text-sm">
                          {(g.genres || []).map((id) => genreById(id) && <span key={id} title={genreById(id).label}>{genreById(id).emoji}</span>)}
                          {(g.traits || []).map((id) => traitById(id) && <span key={id} title={traitById(id).label}>{traitById(id).emoji}</span>)}
                        </div>
                      </div>
                      <div className="font-display text-lg mt-1">{g.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{g.tagline}</div>
                    </button>
                  ))}
                  {!shown.length && <div className="col-span-full text-sm py-6 text-center" style={{ color: 'var(--ink-soft)' }}>해당 태그의 게임이 없어요.</div>}
                </div>
              </>
            )
          })()}
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
            {showPrompt && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <input value={prompt} onChange={(e) => writePrompt(e.target.value)} placeholder={game.promptLabel} className="clay-inset flex-1 min-w-0 px-4 py-2.5" />
                {game.presets?.length > 0 && (
                  <button
                    onClick={() => writePrompt(game.presets[Math.floor(Math.random() * game.presets.length)])}
                    className="clay-btn px-4 text-2xl shrink-0"
                    style={{ background: 'var(--c-grape)', color: '#fff' }}
                    title="랜덤 질문"
                  >
                    🎲
                  </button>
                )}
              </div>
            )}
            {/* mode: 'self' → 게임이 컨트롤을 전부 자체 렌더 (프레임워크 바 숨김) */}
            {ctrl.mode !== 'self' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {ctrl.mode === 'reset' ? (
                  // 초기화만 (항상 입력 가능한 게임)
                  <Button variant="ghost" onClick={() => newRound(roomId)}>{ctrl.resetLabel || '🔄 초기화'}</Button>
                ) : ctrl.mode === 'toggle' ? (
                  // 시작 ↔ 중지 토글 + 초기화
                  <>
                    {meta.roundStatus === 'open' ? (
                      <Button variant="danger" onClick={() => setRoundStatus(roomId, 'reveal')}>{ctrl.stopLabel || '⏹ 중지'}</Button>
                    ) : (
                      <Button variant="ok" onClick={() => setRoundStatus(roomId, 'open')}>{ctrl.startLabel || '🎵 시작'}</Button>
                    )}
                    <Button variant="ghost" onClick={() => newRound(roomId)}>{ctrl.resetLabel || '🔄 초기화'}</Button>
                  </>
                ) : (
                  // 기본: (시작) / (공개) / 새 라운드
                  <>
                    {ctrl.start !== false && (
                      <Button variant="ok" onClick={() => setRoundStatus(roomId, 'open')} disabled={meta.roundStatus === 'open'}>
                        {ctrl.startLabel || '▶ 시작'}
                      </Button>
                    )}
                    {showReveal && (
                      <Button variant="warn" onClick={() => setRoundStatus(roomId, 'reveal')}>👁 공개</Button>
                    )}
                    <Button variant="ghost" onClick={doNext}>{ctrl.resetLabel || '🔄 새 라운드'}</Button>
                  </>
                )}
              </div>
            )}
            <div className="clay-inset p-4 min-h-[180px]">
              <game.HostView roomId={roomId} base={base} meta={meta} players={players} teams={teams} writePrompt={writePrompt} />
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

