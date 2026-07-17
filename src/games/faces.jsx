// 너 이름이 뭐니 — 선착순 부저 + 인물 사진.
// 개인전: 성공자는 그 판 끝까지 관전(승자 제외). 못 맞힌 채 남은 사람이 벌칙. 점수 없음.
// 팀전: 먼저 부저 누른 사람의 팀이 정답 기회 → 성공 시 그 팀 +1점, 실패 시 그 팀은 이번 사진 탈락.
//       판 끝나면 팀 점수 집계 → 호스트가 '점수 반영' 눌러야 팀 점수에 합산(수동).
import { useValue, dbSet, dbUpdate, dbRemove, dbTransaction, SERVER_TS, toList } from '../lib/db'
import { PRESETS, presetByKey } from './decks/facesData'
import { addTeamScore } from '../lib/actions'
import ModeTabs from '../components/ModeTabs'
import { Button, TeamBadge } from '../components/ui'

const MODES = [
  { id: 'solo', label: '개인전', emoji: '🧍' },
  { id: 'team', label: '팀전', emoji: '👥' },
]

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ───────────────────────── 호스트 ───────────────────────── */
function HostView({ roomId, base, players, teams }) {
  const preset = useValue(`${base}/preset`)
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`) || 0
  const revealed = useValue(`${base}/revealed`)
  const buzzRaw = useValue(`${base}/buzz`)
  const failed = useValue(`${base}/failed`)
  const won = useValue(`${base}/won`)
  const mode = useValue(`${base}/mode`) || 'solo'
  const pts = useValue(`${base}/pts`)
  const scored = useValue(`${base}/scored`)

  const isTeam = mode === 'team'
  const wonList = players.filter((p) => won?.[p.id])

  // 판 선택 전
  if (!preset) {
    const m = mode
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-3">🕵️ 어느 판으로 시작할까요?</p>
        <div className="mb-4">
          <ModeTabs modes={MODES} value={m} onChange={(v) => dbSet(`${base}/mode`, v)} />
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() =>
                dbSet(base, { preset: p.key, mode: m, order: shuffle(p.cards.length), idx: 0, revealed: false, buzz: null, failed: null, won: null, pts: null, scored: null })
              }
              className="clay-btn py-6 font-display text-2xl"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {p.label}
              <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{p.cards.length}명</div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
          접속 {players.length}명 · {m === 'team'
            ? '먼저 누른 사람의 팀이 정답 기회 · 성공하면 팀 +1점'
            : '사진마다 먼저 부저 누른 순으로 정답 기회 · 성공자는 관전'}
        </p>
      </div>
    )
  }

  const deck = presetByKey(preset)
  const cards = deck?.cards || []
  const total = order?.length || 0
  const done = idx >= total

  // 판 종료
  if (done) {
    if (isTeam) {
      const rank = [...teams].sort((a, b) => (pts?.[b.id] || 0) - (pts?.[a.id] || 0))
      const best = pts?.[rank[0]?.id] || 0
      const applyScore = async () => {
        const r = await dbTransaction(`${base}/scored`, (cur) => (cur ? undefined : true))
        if (!r.committed) return
        teams.forEach((t) => (pts?.[t.id] || 0) > 0 && addTeamScore(roomId, t.id, pts[t.id]))
      }
      return (
        <div className="text-center py-6">
          <div className="text-5xl">🏁</div>
          <p className="mt-3 font-display text-2xl">{deck?.label} 종료!</p>
          <div className="mt-4 max-w-md mx-auto space-y-1.5">
            {rank.map((t, i) => (
              <div key={t.id} className="clay-inset flex items-center gap-2 px-3 py-2">
                <span className="font-display text-lg w-6">{i + 1}</span>
                <span className="flex-1 text-left font-bold" style={{ color: t.color }}>{t.name}</span>
                <span className="font-display text-xl">{pts?.[t.id] || 0}점</span>
              </div>
            ))}
          </div>
          {best > 0 && <p className="mt-3 font-display text-3xl animate-pop" style={{ color: rank[0].color }}>🏆 {rank[0].name} 승리!</p>}
          <p className="mt-2 text-sm" style={{ color: 'var(--c-coral)' }}>꼴찌 팀은 벌칙! 🍺</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <Button onClick={applyScore} disabled={!!scored}>{scored ? '✅ 점수 반영됨' : '➕ 팀 점수에 반영'}</Button>
            <Button variant="ghost" onClick={() => dbSet(base, null)}>🔄 다른 판 선택</Button>
          </div>
        </div>
      )
    }
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
  // 이번 사진에서 정답 기회가 있는 순위
  // 개인전: won=판제외, failed=이번사진탈락 제외 / 팀전: failed는 팀 단위, 팀당 최초 1명만 대표로 표시
  const seenTeams = new Set()
  const ranked = toList(buzzRaw)
    .filter((b) => typeof b.ts === 'number')
    .sort((a, b) => a.ts - b.ts)
    .filter((b) => {
      if (!isTeam) return !won?.[b.id] && !failed?.[b.id]
      if (!b.teamId || failed?.[b.teamId] || seenTeams.has(b.teamId)) return false
      seenTeams.add(b.teamId)
      return true
    })
  const top = ranked[0]

  const succeed = (b) =>
    isTeam
      ? dbUpdate(base, { [`pts/${b.teamId}`]: (pts?.[b.teamId] || 0) + 1, revealed: true })
      : dbUpdate(base, { [`won/${b.id}`]: true, revealed: true })
  const fail = (b) => dbSet(`${base}/failed/${isTeam ? b.teamId : b.id}`, true)
  const nextPhoto = () => dbUpdate(base, { idx: idx + 1, revealed: false, buzz: null, failed: null })

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-2">
        <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {isTeam ? '👥 팀전 · ' : ''}{idx + 1}/{total}</span>
        {isTeam ? (
          <span className="flex flex-wrap gap-1.5 text-sm">
            {teams.map((t) => (
              <span key={t.id} className="clay-inset px-2 py-0.5 font-bold" style={{ color: t.color }}>{t.name} {pts?.[t.id] || 0}</span>
            ))}
          </span>
        ) : wonList.length > 0 ? (
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>🎉 통과 {wonList.length}명</span>
        ) : null}
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
                    <button onClick={() => succeed(b)} className="clay-btn text-sm px-3 py-1 rounded-full shrink-0" style={{ background: 'var(--c-mint)', color: '#fff' }}>✅ 성공</button>
                    <button onClick={() => fail(b)} className="clay-btn text-sm px-3 py-1 rounded-full shrink-0" style={{ background: 'var(--c-coral)', color: '#fff' }}>❌ 실패</button>
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
  const mode = useValue(`${base}/mode`) || 'solo'
  const isTeam = mode === 'team'
  const myBuzz = useValue(`${base}/buzz/${me.id}`)
  const failedSolo = useValue(`${base}/failed/${me.id}`)
  const failedTeam = useValue(`${base}/failed/${me.teamId || '_'}`)
  const iFailed = isTeam ? failedTeam : failedSolo
  const wonSolo = useValue(`${base}/won/${me.id}`)
  const iWon = isTeam ? false : wonSolo

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
        <p className="mt-3 font-display text-xl">{isTeam ? '우리 팀은 이번 사진 탈락!' : '이번 사진은 탈락!'}</p>
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
  tagline: '인물 맞추기 · 선착순 · 개인전/팀전',
  genres: ['physical', 'brain'],
  traits: ['team', 'solo'],
  controls: { mode: 'self' },
  HostView,
  PlayerView,
}
