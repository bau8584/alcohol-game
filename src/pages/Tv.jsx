// 📺 화면 전용 접속 — 아이패드·노트북·TV 같은 '두 번째 기기'가 방에 들어와 화면 역할만 한다.
// · 참가자로 등록되지 않음(닉네임·팀 없음, 인원수에 안 잡힘) · 진행 제어 없음(읽기 전용)
// · HostView는 원래 '다 같이 보는 화면'이라 비밀 정보가 없어 PIN 불필요.
// · HostView 안에는 게임별 조작 버튼이 들어있어서 pointer-events 차단으로 오조작을 막는다.
import { useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { gameById } from '../games/registry'
import { playBase } from '../lib/actions'
import { PhaseTag } from '../components/ui'

const noop = () => {}

export default function Tv() {
  const { roomId } = useParams()
  const { loading, exists, meta, players, teams } = useRoom(roomId)
  const game = meta?.activeGameId ? gameById(meta.activeGameId) : null
  const base = game ? playBase(roomId, meta.roundSeq, game.id) : null

  if (loading) return <Center>불러오는 중…</Center>
  if (!exists) return <Center>방 코드 {roomId}를 찾을 수 없어요.</Center>

  const joinUrl = `${location.origin}/play/${roomId}`

  return (
    <div className="min-h-full p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      {/* 상단: 방 코드 + 참가 주소 + 팀 점수 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span style={{ color: 'var(--ink-soft)' }}>방 코드 </span>
          <span className="font-display text-4xl md:text-5xl tracking-widest">{roomId}</span>
        </div>
        <div className="text-right">
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>📱 참가하기</div>
          <div className="font-display text-lg md:text-2xl">{joinUrl}</div>
        </div>
      </div>

      <TeamScores teams={teams} />

      {game ? (
        <div className="clay p-4 md:p-6" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="font-display text-3xl md:text-4xl">{game.emoji} {game.name}</span>
            <PhaseTag status={meta.roundStatus} />
          </div>
          {/* 읽기 전용: 내부 조작 버튼이 눌리지 않도록 차단 */}
          <div className="pointer-events-none select-none">
            <game.HostView roomId={roomId} base={base} meta={meta} players={players} teams={teams} writePrompt={noop} />
          </div>
        </div>
      ) : (
        <div className="clay p-8 text-center" style={{ background: 'var(--surface)' }}>
          <div className="text-7xl animate-pulse">⏳</div>
          <p className="mt-4 font-display text-3xl">진행자가 게임을 고르는 중…</p>
          <div className="mt-6">
            <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>접속자 {players.length}명</div>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <span key={p.id} className="clay-inset px-3 py-1.5 font-bold">{p.nickname}</span>
              ))}
              {!players.length && <span style={{ color: 'var(--ink-soft)' }}>아직 아무도 없어요. 위 주소로 참가하세요!</span>}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs" style={{ color: 'var(--ink-soft)' }}>
        📺 화면 전용 · 진행은 진행자 폰에서 하세요
      </p>
    </div>
  )
}

// TV용 큰 팀 점수 (읽기 전용)
const MEDALS = ['🥇', '🥈', '🥉']
function TeamScores({ teams }) {
  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const rankOf = (t) => teams.filter((x) => x.score > t.score).length
  if (!teams.length) return null
  return (
    <div className="clay p-3 flex flex-wrap items-center justify-center gap-2" style={{ background: 'var(--surface)' }}>
      {ranked.map((t) => (
        <span key={t.id} className="px-4 py-2 rounded-2xl font-display text-2xl md:text-3xl flex items-center gap-2" style={{ background: t.color, color: '#fff' }}>
          {t.score > 0 && MEDALS[rankOf(t)] && <span>{MEDALS[rankOf(t)]}</span>}
          <span>{t.name}</span>
          <span className="tabular-nums">{t.score}</span>
        </span>
      ))}
    </div>
  )
}

function Center({ children }) {
  return <div className="min-h-full flex items-center justify-center font-display text-2xl" style={{ color: 'var(--ink-soft)' }}>{children}</div>
}
