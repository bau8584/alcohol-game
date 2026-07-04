// 딩동 — 선착순 부저. 서버 타임스탬프로 가장 먼저 누른 사람 판정 + 순위.
// 오프라인 진행 보조용: 힌트 입력·공개 없음. 항상 입력 가능, 한 번 누르면 초기화 전까지 잠김. 컨트롤은 초기화만.
import { useMemo } from 'react'
import { useValue, dbTransaction, dbRemove, SERVER_TS, toList } from '../lib/db'
import { TeamBadge } from '../components/ui'

function HostView({ base }) {
  const raw = useValue(`${base}/buzz`)
  const order = useMemo(
    () => toList(raw).filter((b) => typeof b.ts === 'number').sort((a, b) => a.ts - b.ts),
    [raw]
  )
  const winner = order[0]

  return (
    <div className="text-center">
      {!winner ? (
        <div className="py-8 text-3xl font-display" style={{ color: 'var(--c-coral)' }}>
          먼저 누르세요! 🎵
        </div>
      ) : (
        <div className="py-4">
          <div style={{ color: 'var(--ink-soft)' }}>가장 먼저! 🎵</div>
          <div className="font-display text-6xl mt-1 animate-pop">{winner.nickname}</div>
          <div className="mt-2">
            <TeamBadge teamId={winner.teamId} />
          </div>
          <ol className="mt-5 mx-auto max-w-md space-y-1.5">
            {order.slice(0, 5).map((b, i) => (
              <li key={b.id} className="clay-inset flex items-center gap-3 px-4 py-2">
                <span className="flex-1 text-left">{i + 1}. {b.nickname}</span>
                <span style={{ color: 'var(--ink-soft)' }}>{i === 0 ? '0ms' : `+${b.ts - winner.ts}ms`}</span>
                <button
                  onClick={() => dbRemove(`${base}/buzz/${b.id}`)}
                  className="clay-btn text-sm px-3 py-1 rounded-full shrink-0"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
                >
                  ↩ 무르기
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, me }) {
  const myBuzz = useValue(`${base}/buzz/${me.id}`)
  const pressed = !!myBuzz
  const buzz = () => {
    if (pressed) return
    dbTransaction(`${base}/buzz/${me.id}`, (cur) =>
      cur ? undefined : { ts: SERVER_TS, nickname: me.nickname, teamId: me.teamId }
    )
    if (navigator.vibrate) navigator.vibrate(60)
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onPointerDown={buzz}
        disabled={pressed}
        className="relative w-64 h-64 rounded-full font-display text-5xl clay-btn"
        style={{ background: pressed ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}
      >
        {!pressed && (
          <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ background: 'var(--c-coral)', opacity: 0.4 }} />
        )}
        {pressed ? '눌렀다!✅' : '🎵'}
      </button>
      <p style={{ color: 'var(--ink-soft)' }}>{pressed ? '메인 화면 확인!' : '먼저 누르세요!'}</p>
    </div>
  )
}

export default {
  id: 'buzzer',
  name: '딩동',
  emoji: '🎵',
  tagline: '선착순 부저',
  genres: ['physical'],
  traits: [],
  controls: { prompt: false, reveal: false, mode: 'reset' },
  HostView,
  PlayerView,
}
