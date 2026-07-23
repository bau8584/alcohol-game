// 군중심리 — "남들이 제일 많이 뽑을 사람"을 맞히는 메타 예측 게임.
// 소신이 아니라 '군중 읽기'가 핵심. 최다득표 상위 N등(호스트가 1~3 설정)을 뽑았으면 안전, 나머지는 벌칙 🍺.
// 등수는 득표수 기준 + 동점은 공동 등수(1,1,3). 득표 0인 사람은 등수 없음.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import QpoolPick from '../components/QpoolPick'

// 질문 풀 — 🎲 일반 / 🎲 19금(19금 토글 ON일 때만 노출)
// 군중심리는 '집단이 한 명으로 몰릴 평판·캐릭터 예측'에 특화.
// (직접 지목해 놀리는 질문은 '고르기(pick)'로 분리 — 중복 최소화)
const NORMAL = [
  '여기서 제일 먼저 취할 것 같은 사람?',
  '오늘 밤 제일 늦게까지 살아남을 사람?',
  '이 중에 제일 인기 많은 사람?',
  '분위기 메이커는?',
  '제일 잘 챙겨주는 사람?',
  '이 모임에서 없으면 제일 허전할 사람?',
  '방이 제일 더러울 것 같은 사람?',
  '오늘 사고 칠 것 같은 사람?',
  '제일 늦잠 잘 것 같은 사람?',
  '술값 제일 많이 낼 것 같은 사람?',
  '제일 먼저 결혼할 것 같은 사람?',
  '여기서 제일 부자 될 것 같은 사람?',
  '싸움 제일 잘할 것 같은 사람?',
  '제일 순진해 보이는 사람?',
  '엉뚱한 소리 제일 많이 하는 사람?',
  '제일 먹성 좋은 사람?',
  '리더 시키면 제일 잘할 사람?',
  '제일 반전 있을 것 같은 사람?',
  '다들 은근히 어려워하는 사람?',
  '제일 눈치 빠른 사람?',
  '갑자기 연예인 됐다고 하면 믿길 사람?',
  '여행 가면 총무 시킬 사람?',
  '길 잃으면 제일 먼저 길 찾아줄 것 같은 사람?',
  '여기서 제일 개그 욕심 많은 사람?',
  '제일 목소리 큰 사람?',
  '제일 사진 잘 나오는 사람?',
  '5년 뒤 제일 성공해 있을 사람?',
  '밤새우자 하면 끝까지 안 잘 것 같은 사람?',
]
const ADULT = [
  '여기서 제일 밝힐 것 같은 사람?',
  '연애 경험 제일 많을 것 같은 사람?',
  '폰에 야한 거 제일 많을 것 같은 사람?',
  '오늘 밤 커플 될 것 같은 사람?',
  '검색기록 절대 못 보여줄 것 같은 사람?',
  '은근 밝히는데 아닌 척하는 사람?',
  '침대에서 제일 반전 있을 것 같은 사람?',
  '취하면 갑자기 색기 폭발할 것 같은 사람?',
  '야한 꿈 제일 자주 꿀 것 같은 사람?',
  '첫 경험 썰이 제일 화끈할 것 같은 사람?',
  '클럽 가면 제일 인기 많을 것 같은 사람?',
  '연상·연하 다 홀릴 것 같은 사람?',
  '속옷이 제일 화려할 것 같은 사람?',
  '밤에 돌변할 것 같은 사람?',
  '야한 농담이 제일 자연스러운 사람?',
  '이 중에 몰래 사귀는 사람 있을 것 같은데, 누구?',
]

const RANKS = [1, 2, 3]

// 득표수 기준 등수 부여 (동점 = 공동 등수: 1,1,3). 득표 0은 제외.
function rankPlayers(players, counts) {
  const voted = players
    .map((p) => ({ ...p, votes: counts[p.id] || 0 }))
    .filter((r) => r.votes > 0)
    .sort((a, b) => b.votes - a.votes)
  let rank = 0
  let prev = null
  voted.forEach((r, i) => {
    if (r.votes !== prev) { rank = i + 1; prev = r.votes }
    r.rank = rank
  })
  return voted
}

function HostView({ roomId, base, meta, players, teams, writePrompt }) {
  const raw = useValue(`${base}/pick`)
  const safeRank = useValue(`${base}/safeRank`) || 1
  const reveal = meta.roundStatus === 'reveal'

  const [q, setQ] = useState(meta.prompt || '')
  useEffect(() => { setQ(meta.prompt || '') }, [meta.roundSeq]) // eslint-disable-line
  const writeQ = (v) => { setQ(v); writePrompt?.(v) }
  const rollFrom = (arr) => writeQ(arr[Math.floor(Math.random() * arr.length)])

  const { ranked, safeIds, correct, wrong, notYet, teamStats, answered } = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const pickMap = Object.fromEntries(toList(raw).map((r) => [r.id, r.value]).filter(([, v]) => v))
    const counts = {}
    Object.values(pickMap).forEach((tid) => { counts[tid] = (counts[tid] || 0) + 1 })
    const ranked = rankPlayers(players, counts)
    const safeIds = new Set(ranked.filter((r) => r.rank <= safeRank).map((r) => r.id))

    const correct = []
    const wrong = []
    Object.entries(pickMap).forEach(([pid, tid]) => {
      ;(safeIds.has(tid) ? correct : wrong).push(byId[pid]?.nickname || pid)
    })
    const notYet = players.filter((p) => !pickMap[p.id])

    const teamStats = (teams || []).map((t) => {
      const ans = (t.members || []).filter((m) => pickMap[m.id])
      const hit = ans.filter((m) => safeIds.has(pickMap[m.id])).length
      return { t, answered: ans.length, hit, rate: ans.length ? hit / ans.length : 0 }
    }).sort((a, b) => b.rate - a.rate || b.hit - a.hit || b.answered - a.answered)

    return { ranked, safeIds, correct, wrong, notYet, teamStats, answered: Object.keys(pickMap).length }
  }, [raw, players, teams, safeRank])

  const maxVotes = Math.max(1, ...ranked.map((r) => r.votes))
  const top = ranked.filter((r) => r.rank === 1)

  return (
    <div>
      {!reveal && (
        <div className="mb-3 max-w-md mx-auto">
          <input value={q} onChange={(e) => writeQ(e.target.value)} placeholder="질문 (직접 입력 또는 주사위)" className="clay-inset w-full px-3 py-2.5 text-center" />
          <div className="flex flex-wrap gap-2 mt-2 justify-center items-center">
            <button onClick={() => rollFrom(NORMAL)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 질문">🎲 일반</button>
            {meta.adultEnabled && <button onClick={() => rollFrom(ADULT)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>}
            <QpoolPick roomId={roomId} onPick={writeQ} />
          </div>

          {/* 안전 범위 — 인원에 맞춰 난이도 조절 */}
          <div className="mt-4 text-center">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>안전 범위 (상위 몇 등까지 맞힌 걸로?)</div>
            <div className="flex justify-center gap-2">
              {RANKS.map((n) => (
                <button
                  key={n}
                  onClick={() => dbSet(`${base}/safeRank`, n)}
                  className="clay-btn px-4 py-2 font-display"
                  style={safeRank === n ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  {n === 1 ? '🎯 1등만' : `${n}등까지`}
                </button>
              ))}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>인원 많으면 2~3등까지 열어주세요 (현재 {players.length}명)</div>
          </div>
        </div>
      )}

      <div className="flex justify-between text-sm gap-2" style={{ color: 'var(--ink-soft)' }}>
        <span className="font-display text-lg" style={{ color: 'var(--ink)' }}>{meta.prompt || '질문을 입력/선택하세요'}</span>
        <span className="shrink-0">{answered}/{players.length} 응답 · 상위 {safeRank}등 안전{!reveal && ' · 공개 전'}</span>
      </div>

      {reveal ? (
        <div className="mt-3">
          {top.length > 0 ? (
            <div className="text-center">
              <span style={{ color: 'var(--ink-soft)' }}>최다득표 </span>
              <span className="font-display text-3xl">{top.map((t) => t.nickname).join(', ')}</span>
              <span style={{ color: 'var(--ink-soft)' }}> ({top[0].votes}표)</span>
            </div>
          ) : (
            <p className="text-center py-4" style={{ color: 'var(--ink-soft)' }}>응답이 없어요.</p>
          )}

          {/* 득표 막대 — 안전권은 초록 */}
          <div className="mt-3 space-y-2 max-w-lg mx-auto">
            {ranked.map((r) => {
              const safe = safeIds.has(r.id)
              return (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="w-6 text-right font-display text-sm" style={{ color: 'var(--ink-soft)' }}>{r.rank}</span>
                  <span className="w-24 truncate text-right font-bold">{r.nickname}</span>
                  <div className="flex-1 h-7 clay-inset overflow-hidden relative">
                    <div className="absolute inset-y-1 left-1 rounded-full flex items-center justify-end pr-2 text-sm font-bold text-white transition-all duration-500" style={{ width: `calc(${(r.votes / maxVotes) * 100}% - 8px)`, background: safe ? 'var(--c-mint)' : 'var(--c-grape)' }}>{r.votes}</div>
                  </div>
                  {safe && <span className="text-sm shrink-0">✅</span>}
                </div>
              )
            })}
          </div>

          {/* 안전 / 벌칙 */}
          <div className="mt-5 grid gap-3 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="clay p-3" style={{ background: 'var(--c-mint)', color: '#fff' }}>
              <div className="font-display text-lg">✅ 안전 · {correct.length}명</div>
              <div className="text-sm mt-1 opacity-90">{correct.join(', ') || '아무도 못 맞혔어요'}</div>
            </div>
            <div className="clay p-3" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="font-display text-lg">🍺 벌칙 · {wrong.length}명</div>
              <div className="text-sm mt-1 opacity-90">{wrong.join(', ') || '전원 통과!'}</div>
            </div>
          </div>
          {notYet.length > 0 && (
            <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>미참여({notYet.length}): {notYet.map((p) => p.nickname).join(', ')}</p>
          )}

          {/* 팀별 적중률 */}
          {teamStats.length > 0 && (
            <div className="mt-5 max-w-md mx-auto text-left">
              <div className="text-sm mb-1 text-center" style={{ color: 'var(--ink-soft)' }}>팀별 적중률 (응답자 기준)</div>
              <div className="space-y-1.5">
                {teamStats.map((s, i) => {
                  const champ = i === 0 && s.answered > 0
                  return (
                    <div key={s.t.id} className="clay flex items-center justify-between px-4 py-2" style={{ background: champ ? s.t.color : 'var(--surface)', color: champ ? '#fff' : 'var(--ink)' }}>
                      <span className="font-display">
                        <span className="w-6 inline-block">{champ ? '🏆' : i + 1}</span>
                        <span style={{ color: champ ? '#fff' : s.t.color }}>{s.t.name}</span>
                        <span className="text-sm opacity-80"> · {s.hit}/{s.answered} 적중</span>
                      </span>
                      <span className="font-display text-xl">{s.answered ? Math.round(s.rate * 100) : 0}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center mt-4">
          <p className="text-xl font-display" style={{ color: 'var(--ink-soft)' }}>군중을 읽는 중… 👁 ‘공개’를 누르면 결과</p>
          {notYet.length > 0 ? (
            <div className="mt-3">
              <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>아직 안 고름 ({notYet.length})</div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
                {notYet.map((p) => (<span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname}</span>))}
              </div>
            </div>
          ) : (
            players.length > 0 && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>전원 선택 완료! ✅</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const mine = useValue(`${base}/pick/${me.id}`)
  const safeRank = useValue(`${base}/safeRank`) || 1
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'

  return (
    <div>
      <p className="text-center font-display text-lg">{meta.prompt || '질문 대기 중…'}</p>
      <p className="text-center text-sm mt-1" style={{ color: 'var(--c-coral)' }}>
        🧠 내 소신 말고 <b>남들이 제일 많이 뽑을 사람</b>을 고르세요!
      </p>
      <p className="text-center text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>지목당한 사람은 벌칙 없음 · <b>군중을 못 읽은 내가 벌칙</b> 🍺 (상위 {safeRank}등 맞히면 안전)</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => open && dbSet(`${base}/pick/${me.id}`, p.id)}
            disabled={!open}
            className="clay-btn py-3 font-display text-lg"
            style={mine === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}{p.id === me.id && ' (나)'}
          </button>
        ))}
        {!players.length && <p className="col-span-2 py-6 text-center" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</p>}
      </div>

      {reveal ? (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>🔒 공개됨 · 메인 화면 확인!</p>
      ) : !open ? (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>
      ) : mine ? (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--c-mint)' }}>선택 완료 · 변경 가능 (비밀)</p>
      ) : null}
    </div>
  )
}

export default {
  id: 'herd',
  name: '군중심리',
  emoji: '👥',
  tagline: '군중 예측 · 못 맞힌 내가 벌칙',
  genres: ['telepathy', 'mind'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
