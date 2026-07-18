// 진행 콘솔 — '게임 선택 / 제어바 + HostView / 점수주기'의 공용 덩어리.
// 큰 화면(/host)과 '진행자도 참가자' 모드의 진행자 폰(Player의 🖥 진행 탭)에서 함께 쓴다.
// 게임 로직은 건드리지 않고, 기존 HostView·컨트롤·AwardPanel을 그대로 재사용한다.
import { useEffect, useState } from 'react'
import { GAMES, gameById, GENRES, TRAITS, genreById, traitById, isBeginner } from '../games/registry'
import { startGame, setRoundStatus, setPrompt, newRound, endGame, playBase } from '../lib/actions'
import AwardPanel from './AwardPanel'
import HowToPlay from './HowToPlay'
import { Button, Card, PhaseTag, TeamBadge } from './ui'
import { useDebounced } from '../lib/useDebounced'

export default function HostConsole({ roomId, meta, players, teams, compact = false }) {
  const [prompt, setPromptLocal] = useState('')
  const [filter, setFilter] = useState(null) // { kind: 'genre'|'trait'|'beginner', id }
  const [previewId, setPreviewId] = useState(null) // 시작 전 규칙 미리보기
  const game = meta?.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null
  // 프롬프트 DB 쓰기는 디바운스 → 타이핑 중 방 전원 재전송 최소화
  const debouncedSetPrompt = useDebounced((v) => setPrompt(roomId, v), 400)

  useEffect(() => {
    setPromptLocal(meta?.prompt || '')
  }, [meta?.activeGameId, meta?.roundSeq]) // eslint-disable-line

  const writePrompt = (v) => {
    setPromptLocal(v) // 로컬 즉시 반영
    debouncedSetPrompt(v) // DB 쓰기는 0.4초 병합
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

  if (!game) {
    const matches = (g) =>
      !filter ||
      (filter.kind === 'beginner' ? isBeginner(g.id)
        : filter.kind === 'genre' ? (g.genres || []).includes(filter.id)
        : (g.traits || []).includes(filter.id))
    // 필터 없을 땐 입문 추천을 맨 앞으로
    const shown = GAMES.filter(matches)
    const ordered = filter ? shown : [...shown].sort((a, b) => (isBeginner(b.id) ? 1 : 0) - (isBeginner(a.id) ? 1 : 0))
    const chip = () => 'clay-btn px-3 py-1.5 text-sm whitespace-nowrap'
    const chipStyle = (active) => (active ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' })
    const previewGame = previewId ? gameById(previewId) : null
    return (
      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-2xl">🎮 게임 선택</h2>
          <span className="text-sm shrink-0" style={{ color: 'var(--ink-soft)' }}>접속 {players.length}명</span>
        </div>
        {!compact && <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>처음이면 <b style={{ color: 'var(--c-mint)' }}>🔰 입문 추천</b>부터. 카드의 <b>❓</b>를 누르면 시작 전에 규칙을 볼 수 있어요.</p>}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilter(null)} className={chip()} style={chipStyle(!filter)}>전체 {GAMES.length}</button>
          <button onClick={() => setFilter(filter?.kind === 'beginner' ? null : { kind: 'beginner' })} className={chip()} style={chipStyle(filter?.kind === 'beginner')}>🔰 입문 추천</button>
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
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {ordered.map((g) => (
            <div key={g.id} className="relative clay-btn p-4 text-left" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <button onClick={() => startGame(roomId, g.id)} disabled={!players.length} className="block w-full text-left disabled:opacity-50">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{g.emoji}</div>
                  <div className="flex gap-1 text-sm">
                    {(g.genres || []).map((id) => genreById(id) && <span key={id} title={genreById(id).label}>{genreById(id).emoji}</span>)}
                    {(g.traits || []).map((id) => traitById(id) && <span key={id} title={traitById(id).label}>{traitById(id).emoji}</span>)}
                  </div>
                </div>
                <div className="font-display text-lg mt-1 flex items-center gap-1">
                  {isBeginner(g.id) && <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--c-mint)', color: '#fff' }}>🔰</span>}
                  {g.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{g.tagline}</div>
              </button>
              <button
                onClick={() => setPreviewId(g.id)}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full text-sm flex items-center justify-center"
                style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}
                title="규칙 미리보기"
              >
                ❓
              </button>
            </div>
          ))}
          {!ordered.length && <div className="col-span-full text-sm py-6 text-center" style={{ color: 'var(--ink-soft)' }}>해당 태그의 게임이 없어요.</div>}
        </div>

        {previewGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPreviewId(null)}>
            <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <HowToPlay gameId={previewGame.id} emoji={previewGame.emoji} name={previewGame.name} defaultOpen />
              <div className="flex gap-2 mt-2">
                <Button className="flex-1" onClick={() => { startGame(roomId, previewGame.id); setPreviewId(null) }} disabled={!players.length}>▶ 이 게임 시작</Button>
                <Button variant="ghost" onClick={() => setPreviewId(null)}>닫기</Button>
              </div>
            </div>
          </div>
        )}
        {!compact && (
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>접속자</div>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname} <TeamBadge teamId={p.teamId} /></span>))}
              {!players.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>아직 아무도 없어요.</span>}
            </div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <>
      <HowToPlay key={game.id} gameId={game.id} emoji={game.emoji} name={game.name} defaultOpen={false} compact />
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl">{game.emoji} {game.name}</span>
            <PhaseTag status={meta.roundStatus} />
          </div>
          <Button variant="ghost" className="shrink-0" onClick={() => endGame(roomId)}>게임 목록</Button>
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
                {showReveal && <Button variant="warn" onClick={() => setRoundStatus(roomId, 'reveal')}>👁 공개</Button>}
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
  )
}
