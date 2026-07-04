// 1. 노래 부저 — 서버 타임스탬프로 밀리초 최초 터치 판정.
import { useMemo } from 'react'
import { useValue, dbTransaction, dbRemove, SERVER_TS, toList } from '../lib/db'
import { TeamBadge } from '../components/ui'

function buzzOrder(raw) {
  return toList(raw)
    .filter((b) => typeof b.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
}

function HostView({ base, meta }) {
  const raw = useValue(`${base}/buzz`)
  const order = useMemo(() => buzzOrder(raw), [raw])
  const winner = order[0]

  return (
    <div className="text-center">
      {meta.roundStatus === 'staged' && (
        <p className="text-white/60 text-xl">‘진행 시작’을 누르면 부저가 활성화됩니다.</p>
      )}
      {meta.roundStatus !== 'staged' && !winner && (
        <div className="py-10">
          <div className="text-3xl font-black text-white/40 animate-pulse">먼저 누르세요! 🔔</div>
        </div>
      )}
      {winner && (
        <div className="py-6">
          <div className="text-white/50">가장 먼저 누른 사람</div>
          <div className="mt-2 text-7xl font-black animate-pop">{winner.nickname}</div>
          <div className="mt-2">
            <TeamBadge teamId={winner.teamId} className="text-lg" />
          </div>
          <ol className="mt-6 mx-auto max-w-md text-left space-y-1">
            {order.slice(0, 6).map((b, i) => (
              <li key={b.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
                <span>
                  <span className="text-white/40 mr-2">{i + 1}.</span>
                  {b.nickname}
                </span>
                <span className="tabular-nums text-white/50">
                  {i === 0 ? '0ms' : `+${b.ts - winner.ts}ms`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const myBuzz = useValue(`${base}/buzz/${me.id}`)
  const open = meta.roundStatus === 'open'
  const pressed = !!myBuzz

  const buzz = () => {
    if (!open || pressed) return
    // 이미 누른 경우 덮어쓰지 않도록 트랜잭션으로 최초 1회만 기록
    dbTransaction(`${base}/buzz/${me.id}`, (cur) =>
      cur ? undefined : { ts: SERVER_TS, nickname: me.nickname, teamId: me.teamId }
    )
    if (navigator.vibrate) navigator.vibrate(60)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onPointerDown={buzz}
        disabled={!open || pressed}
        className={`relative w-64 h-64 rounded-full text-4xl font-black shadow-2xl transition active:scale-95 ${
          pressed
            ? 'bg-emerald-500 text-black'
            : open
              ? 'bg-rose-600 text-white'
              : 'bg-white/10 text-white/40'
        }`}
      >
        {open && !pressed && <span className="absolute inset-0 rounded-full animate-pulseRing bg-rose-500/40" />}
        {pressed ? '눌렀다! ✅' : open ? '🔔 부저' : '대기중'}
      </button>
      <p className="text-white/50 text-sm">
        {pressed ? '판정은 메인 스크린에서 확인하세요.' : open ? '가장 먼저 누르세요!' : '진행자를 기다리세요.'}
      </p>
    </div>
  )
}

export default {
  id: 'buzzer',
  name: '노래 부저',
  emoji: '🔔',
  tagline: '밀리초 최초 터치 판정',
  promptLabel: '노래 힌트 / 문제 (선택)',
  HostView,
  PlayerView,
}
