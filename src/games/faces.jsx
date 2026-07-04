// 너 이름이 뭐니 — 선착순 부저 + 인물 사진 + 승자 제외(개인 생존).
// 사진1장=1라운드. 호스트 화면에 인물이 뜨고 참가자는 부저를 누름 → 선착순 순위.
// 1위부터 정답 외침 → 호스트가 ✅성공/❌실패 판정. 성공자는 그 판 끝까지 관전(참가 불가).
// 못 맞힌 채 판 끝까지 남은 사람이 벌칙. 점수 없음(순수 개인 생존).
import { useMemo } from 'react'
import { useValue, dbSet, dbUpdate, dbRemove, dbTransaction, SERVER_TS, toList } from '../lib/db'
import { PRESETS, presetByKey } from './decks/facesData'
import { Button, TeamBadge } from '../components/ui'

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ───────────────────────── 호스트 ───────────────────────── */
function HostView({ base, players }) {
  const preset = useValue(`${base}/preset`)
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`) || 0
  const revealed = useValue(`${base}/revealed`)
  const buzzRaw = useValue(`${base}/buzz`)
  const failed = useValue(`${base}/failed`)
  const won = useValue(`${base}/won`)

  const nameOf = (id) => players.find((p) => p.id === id)?.nickname || id
  const wonList = players.filter((p) => won?.[p.id])

  // 판 선택 전
  if (!preset) {
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-4">🕵️ 어느 판으로 시작할까요?</p>
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() =>
                dbSet(base, { preset: p.key, order: shuffle(p.cards.length), idx: 0, revealed: false, buzz: null, failed: null, won: null })
              }
              className="clay-btn py-6 font-display text-2xl"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {p.label}
              <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{p.cards.length}명</div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>접속 {players.length}명 · 사진마다 먼저 부저 누른 순으로 정답 기회</p>
      </div>
    )
  }

  const deck = presetByKey(preset)
  const cards = deck?.cards || []
  const total = order?.length || 0
  const done = idx >= total

  // 판 종료
  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl">🏁</div>
        <p className="mt-3 font-display text-2xl">{deck?.label} 종료!</p>
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>🎉 통과(정답)한 사람</div>
          <div className="flex flex-wrap justify-center gap-2">
            {wonList.length ? wonList.map((p) => (
              <span key={p.id} className="clay-inset px-3 py-1 font-bold">{p.nickname}</span>
            )) : <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>아무도 없어요 😈</span>}
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--c-coral)' }}>끝까지 못 맞힌 사람은 벌칙! 🍺</p>
        </div>
        <Button variant="ghost" className="mt-5" onClick={() => dbSet(base, null)}>🔄 다른 판 선택</Button>
      </div>
    )
  }

  const cur = cards[order?.[idx]]
  // 이번 사진에서 정답 기회가 있는 순위 (won=판제외, failed=이번사진탈락 제외)
  const ranked = toList(buzzRaw)
    .filter((b) => typeof b.ts === 'number' && !won?.[b.id] && !failed?.[b.id])
    .sort((a, b) => a.ts - b.ts)
  const top = ranked[0]

  const succeed = (pid) => dbUpdate(base, { [`won/${pid}`]: true, revealed: true })
  const fail = (pid) => dbSet(`${base}/failed/${pid}`, true)
  const nextPhoto = () => dbUpdate(base, { idx: idx + 1, revealed: false, buzz: null, failed: null })

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2">
        <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {idx + 1}/{total}</span>
        {wonList.length > 0 && (
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>🎉 통과 {wonList.length}명</span>
        )}
      </div>

      {/* 인물 사진 (데스크톱에서 크게) */}
      <div className="relative mx-auto max-w-xl md:max-w-3xl">
        <img src={cur?.url} alt="" className="mx-auto rounded-2xl object-contain w-full max-h-[52vh] md:max-h-[70vh] clay-inset" />
        {revealed && (
          <div className="absolute inset-x-0 bottom-0 py-3 rounded-b-2xl font-display text-3xl animate-pop" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
            {cur?.answer}
          </div>
        )}
      </div>

      {/* 선착순 순위 */}
      <div className="mt-4 max-w-md mx-auto">
        {ranked.length === 0 ? (
          <p className="py-3 font-display text-xl" style={{ color: 'var(--c-coral)' }}>먼저 부저를 누르세요! 🔔</p>
        ) : (
          <ol className="space-y-1.5">
            {ranked.slice(0, 6).map((b, i) => (
              <li
                key={b.id}
                className="clay-inset flex items-center gap-2 px-3 py-2"
                style={i === 0 ? { outline: '2px solid var(--c-mint)' } : undefined}
              >
                <span className="font-display text-lg w-6">{i + 1}</span>
                <span className="flex-1 text-left font-bold">{b.nickname}</span>
                <TeamBadge teamId={b.teamId} className="!px-2 !py-0.5 !text-xs" />
                {i === 0 && (
                  <>
                    <button onClick={() => succeed(b.id)} className="clay-btn text-sm px-3 py-1 rounded-full shrink-0" style={{ background: 'var(--c-mint)', color: '#fff' }}>✅ 성공</button>
                    <button onClick={() => fail(b.id)} className="clay-btn text-sm px-3 py-1 rounded-full shrink-0" style={{ background: 'var(--c-coral)', color: '#fff' }}>❌ 실패</button>
                  </>
                )}
                {i !== 0 && (
                  <button onClick={() => dbRemove(`${base}/buzz/${b.id}`)} className="clay-btn text-xs px-2 py-1 rounded-full shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>↩</button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 진행 컨트롤 */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {!revealed && <Button variant="warn" onClick={() => dbSet(`${base}/revealed`, true)}>👁 정답</Button>}
        <Button variant="ghost" onClick={nextPhoto}>⏭ 패스 / 다음 사진 ▶</Button>
      </div>
      {top && !revealed && (
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}><b>{top.nickname}</b> 님부터 정답을 외쳐주세요!</p>
      )}
    </div>
  )
}

/* ───────────────────────── 플레이어 ───────────────────────── */
function PlayerView({ base, me }) {
  const preset = useValue(`${base}/preset`)
  const idx = useValue(`${base}/idx`) || 0
  const myBuzz = useValue(`${base}/buzz/${me.id}`)
  const iFailed = useValue(`${base}/failed/${me.id}`)
  const iWon = useValue(`${base}/won/${me.id}`)

  if (!preset) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🕵️</div>
        <p className="mt-3 font-display text-xl">호스트가 판을 고르는 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
      </div>
    )
  }

  if (iWon) {
    return (
      <div className="clay p-8 text-center" style={{ background: 'var(--c-mint)', color: '#fff' }}>
        <div className="text-6xl">🎉</div>
        <p className="mt-3 font-display text-2xl">통과!</p>
        <p className="mt-1 opacity-90">이 판은 관전이에요. 편하게 구경하세요 😎</p>
      </div>
    )
  }

  if (iFailed) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">😵</div>
        <p className="mt-3 font-display text-xl">이번 사진은 탈락!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>다음 사진에서 다시 도전하세요.</p>
      </div>
    )
  }

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
      {/* idx가 바뀌면 위 myBuzz/iFailed가 초기화돼 버튼이 다시 활성화됨 */}
      <button
        key={idx}
        onPointerDown={buzz}
        disabled={pressed}
        className="relative w-64 h-64 rounded-full font-display text-5xl clay-btn"
        style={{ background: pressed ? 'var(--c-grape)' : 'var(--c-coral)', color: '#fff' }}
      >
        {!pressed && <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ background: 'var(--c-coral)', opacity: 0.4 }} />}
        {pressed ? '눌렀다!✅' : '🔔'}
      </button>
      <p style={{ color: 'var(--ink-soft)' }}>{pressed ? '순위 확인! 1등이면 정답 외치기' : '아는 인물이면 먼저 누르세요!'}</p>
    </div>
  )
}

export default {
  id: 'faces',
  name: '너 이름이 뭐니',
  emoji: '🕵️',
  tagline: '인물 맞추기 · 선착순 · 승자 제외',
  genres: ['physical', 'brain'],
  traits: ['solo'],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
