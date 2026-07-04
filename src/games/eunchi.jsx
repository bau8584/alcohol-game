// ⑧ 눈치게임 — 1..N(=참가자 수)을 아무나 순서대로 '외치기'. 서버 타임스탬프로 동시 터치(충돌) 자동 판정.
// 오프라인에선 심판이 불가능한 ms 단위 겹침을 서버만 잴 수 있는 웹 고유 재해석.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbPush, dbTransaction, SERVER_TS, toList } from '../lib/db'

// 동시 터치(충돌) 판정 난이도 3단계 — 이 간격(ms) 안에 잡힌 연속 번호 = 충돌
const LEVELS = [
  { id: 'strict', label: '빡빡', ms: 150, emoji: '🔥' },
  { id: 'normal', label: '보통', ms: 300, emoji: '🙂' },
  { id: 'loose', label: '느슨', ms: 500, emoji: '🍺' },
]
const DEFAULT_MS = 300

function analyze(tapsRaw, clashMs) {
  const taps = toList(tapsRaw)
    .filter((t) => typeof t.ts === 'number' && typeof t.k === 'number')
    .sort((a, b) => a.k - b.k)
  const clash = new Set()
  for (let i = 1; i < taps.length; i++) {
    if (Math.abs(taps[i].ts - taps[i - 1].ts) < clashMs) {
      clash.add(taps[i].k)
      clash.add(taps[i - 1].k)
    }
  }
  return { taps, clash }
}

function HostView({ base, meta, players }) {
  const N = players.length
  const count = useValue(`${base}/count`) || 0
  const tapsRaw = useValue(`${base}/taps`)
  const clashMs = useValue(`${base}/clashMs`) || DEFAULT_MS
  const { taps, clash } = useMemo(() => analyze(tapsRaw, clashMs), [tapsRaw, clashMs])
  const done = count >= N && N > 0
  const finalHolder = done ? taps.find((t) => t.k === N) : null
  const started = meta.roundStatus === 'open' || count > 0

  return (
    <div className="text-center">
      <div className="font-display text-xl">🔢 1부터 {N}까지 아무나 순서대로!</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>충돌 판정</span>
        {LEVELS.map((lv) => (
          <button
            key={lv.id}
            onClick={() => dbSet(`${base}/clashMs`, lv.ms)}
            disabled={started}
            className="clay-btn px-3 py-1.5 text-sm font-display disabled:opacity-50"
            style={clashMs === lv.ms ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {lv.emoji} {lv.label}
          </button>
        ))}
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({(clashMs / 1000).toFixed(2)}초)</span>
      </div>
      {!done ? (
        <div className="mt-2" style={{ color: 'var(--ink-soft)' }}>다음 번호 <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{count + 1}</span> / {N}</div>
      ) : (
        <div className="mt-3 font-display text-3xl animate-pop" style={{ color: 'var(--c-coral)' }}>💀 마지막 {N}번: {finalHolder?.by || '?'}</div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {taps.map((t) => {
          const bad = clash.has(t.k)
          return (
            <span key={t.k} className="clay-inset px-3 py-1.5 font-bold animate-pop" style={bad ? { background: 'var(--c-coral)', color: '#fff' } : {}}>
              {t.k}. {t.by}{bad && ' 💥'}
            </span>
          )
        })}
        {!taps.length && <p className="py-8" style={{ color: 'var(--ink-soft)' }}>아직 아무도 안 외쳤어요. 🤫</p>}
      </div>
      {clash.size > 0 && <p className="mt-3 font-bold" style={{ color: 'var(--c-coral)' }}>💥 동시에 외친 사람들 = 벌칙!</p>}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const N = players.length
  const count = useValue(`${base}/count`) || 0
  const [myK, setMyK] = useState(null)
  const open = meta.roundStatus === 'open'
  const done = count >= N && N > 0
  const active = open && !done

  const press = async () => {
    if (!active) return
    const res = await dbTransaction(`${base}/count`, (cur) => ((cur || 0) >= N ? undefined : (cur || 0) + 1))
    if (!res.committed) return
    const k = res.snapshot.val()
    if (k == null || k > N) return
    setMyK(k)
    await dbPush(`${base}/taps`, { by: me.nickname, k, ts: SERVER_TS })
    if (navigator.vibrate) navigator.vibrate(40)
  }

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>{done ? '게임 종료' : active ? `다음 번호 ${count + 1} / ${N}` : '진행자 대기 중'}</div>
      <button
        onPointerDown={press}
        disabled={!active}
        className="mt-3 w-full h-72 rounded-3xl font-display text-4xl clay-btn"
        style={{ background: active ? 'var(--c-grape)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--ink-soft)' }}
      >
        {active ? '🗣️ 외치기!' : done ? '끝!' : '대기'}
        {myK != null && <div className="text-2xl mt-2 opacity-90">내가 외친 마지막: {myK}</div>}
      </button>
      <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>남과 동시에 외치면 벌칙! 눈치껏 🫣</p>
    </div>
  )
}

export default {
  id: 'eunchi',
  name: '눈치게임',
  emoji: '🔢',
  tagline: '동시 터치 자동판정',
  genres: ['physical', 'mind'],
  traits: [],
  controls: { reveal: false, startLabel: '▶ 시작', resetLabel: '🔄 새 게임', resetArms: true },
  HostView,
  PlayerView,
}
