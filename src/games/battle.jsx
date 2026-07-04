// ⑩ 밸런스 배틀 — 질문은 'A(입력) vs B(입력)' 구조. 참가자가 질문을 제안하면 큐에 쌓이고 호스트가 하나 선택.
// 진행자가 '소수파 벌칙 / 다수파 벌칙'을 사전 선택 → 공개 시 대상 진영을 고른 사람이 가장 많은 팀을 지목.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useValue, dbSet, dbPush, toList } from '../lib/db'
import ModeTabs from '../components/ModeTabs'
import { Button } from '../components/ui'

const MODES = [
  { id: 'minority', label: '소수파 벌칙', emoji: '🎯' },
  { id: 'majority', label: '다수파 벌칙', emoji: '👥' },
]
const PAIRS = [
  ['부먹', '찍먹'], ['민초', '반민초'], ['평생 여름', '평생 겨울'],
  ['돈 많은 백수', '바쁜 부자'], ['매일 연락', '가끔 연락'], ['치킨', '피자'],
  ['산', '바다'], ['아침형', '저녁형'], ['과거로 가기', '미래 보기'],
  // 어렵고 재밌는 딜레마
  ['평생 돈 걱정 없기', '평생 사랑 안 식기'],
  ['외모 +50% 지능 -20%', '지능 +50% 외모 -20%'],
  ['모두가 내 마음 읽기', '내가 모두 마음 읽기'],
  ['1억 받고 절친과 절연', '그냥 살기'],
  ['애인 폰 몰래 보기', '내 폰 애인이 보기'],
  ['10년 젊어지기', '현금 10억'],
  ['평생 반말만', '평생 존댓말만'],
  ['전 애인 결혼식 축가', '내 결혼식에 전 애인 참석'],
  ['평생 신발 속 젖은 채', '평생 이에 고춧가루'],
  ['말할 때 무조건 노래로', '이동할 때 무조건 춤으로'],
  ['카톡 영원히 읽씹', '전화 영원히 안 받힘'],
  ['전 애인과 재회', '평생 모태솔로'],
  ['투명인간 되기', '하늘 날기'],
  ['평생 한 음식만', '평생 같은 옷만'],
]

// 19금 밸런스 (수위 높음 · 재밌게)
const ADULT_PAIRS = [
  ['원나잇 100번', '평생 한 사람만'],
  ['목소리 야한 사람', '몸매 좋은 사람'],
  ['하루 10번', '한 달 1번'],
  ['테크닉 최고인데 못생김', '잘생겼는데 이기적'],
  ['애인이 전 애인과 잔 걸 알기', '내가 전 애인과 잔 걸 애인이 알기'],
  ['소리 큰 애인', '반응 1도 없는 애인'],
  ['모텔에서 아는 사람과 마주치기', '부모님한테 딱 걸리기'],
  ['전 애인이 더 좋았다고 듣기', '내가 별로였다고 듣기'],
  ['키스 못하는 미남/미녀', '키스 잘하는 평범'],
  ['공공장소 스릴', '평생 불 끄고만'],
  ['첫 경험 다시 하기', '지금 애인이 마지막'],
  ['내 검색기록 공개', '애인 갤러리 전체 공개'],
  ['평생 상위만', '평생 하위만'],
  ['금욕 1년 후 1억', '그냥 자유롭게 살기'],
]

function HostView({ base, meta, players, teams }) {
  const mode = useValue(`${base}/mode`) || 'minority'
  const q = useValue(`${base}/q`)
  const suggestions = toList(useValue(`${base}/suggestions`))
  const raw = useValue(`${base}/choice`)
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'

  // 질문 편집 로컬 상태 (q 에서 1회 시드)
  const [ea, setEa] = useState('')
  const [eb, setEb] = useState('')
  const seeded = useRef(false)
  useEffect(() => {
    if (!seeded.current && q) {
      setEa(q.a || '')
      setEb(q.b || '')
      seeded.current = true
    }
  }, [q])
  const writeA = (v) => { setEa(v); dbSet(`${base}/q`, { a: v, b: eb }) }
  const writeB = (v) => { setEb(v); dbSet(`${base}/q`, { a: ea, b: v }) }
  const pick = (a, b) => { setEa(a); setEb(b); dbSet(`${base}/q`, { a, b }) }
  const rollFrom = (arr) => { const [a, b] = arr[Math.floor(Math.random() * arr.length)]; pick(a, b) }

  const modeLabel = mode === 'minority' ? '소수파' : '다수파'
  const { a, b, target, byTeam, topN, answered } = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p]))
    const choice = Object.fromEntries(toList(raw).map((c) => [c.id, c.value]))
    let a = 0
    let b = 0
    Object.values(choice).forEach((v) => {
      if (v === 'A') a++
      else if (v === 'B') b++
    })
    let target = null
    if (a !== b && (a > 0 || b > 0)) {
      const fewer = a < b ? 'A' : 'B'
      const more = a > b ? 'A' : 'B'
      target = mode === 'minority' ? fewer : more
    }
    const byTeam = {}
    if (target) {
      Object.entries(choice).forEach(([pid, v]) => {
        if (v === target) {
          const tid = byId[pid]?.teamId
          if (tid) byTeam[tid] = (byTeam[tid] || 0) + 1
        }
      })
    }
    const topN = Math.max(0, ...teams.map((t) => byTeam[t.id] || 0))
    return { a, b, target, byTeam, topN, answered: a + b }
  }, [raw, players, teams, mode])

  return (
    <div className="text-center">
      {staged && (
        <div className="mb-4">
          <ModeTabs modes={MODES} value={mode} onChange={(m) => dbSet(`${base}/mode`, m)} />
        </div>
      )}

      {/* 현재 질문 */}
      <div className="font-display text-2xl">
        {q?.a || q?.b ? <>{q.a || '?'} <span style={{ color: 'var(--ink-soft)' }}>vs</span> {q.b || '?'}</> : <span style={{ color: 'var(--ink-soft)' }}>질문을 정하세요</span>}
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
        {modeLabel} 벌칙 · {answered}/{players.length} 응답 {reveal ? '· 공개' : staged ? '· 대기' : '· 비밀'}
      </div>

      {/* 질문 편집 + 참가자 제안 큐 (대기 중에만) */}
      {staged && (
        <div className="mt-4 max-w-lg mx-auto text-left">
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input value={ea} onChange={(e) => writeA(e.target.value)} placeholder="A (예: 부먹)" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
              <span className="font-display" style={{ color: 'var(--ink-soft)' }}>vs</span>
              <input value={eb} onChange={(e) => writeB(e.target.value)} placeholder="B (예: 찍먹)" className="clay-inset flex-1 min-w-0 px-3 py-2 text-center" />
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => rollFrom(PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 질문">🎲</button>
              <button onClick={() => rollFrom(ADULT_PAIRS)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>💡 참가자 제안 ({suggestions.length})</div>
            {suggestions.length > 0 && <button onClick={() => dbSet(`${base}/suggestions`, null)} className="text-sm underline" style={{ color: 'var(--ink-soft)' }}>비우기</button>}
          </div>
          <div className="mt-1 space-y-1.5 max-h-52 overflow-y-auto">
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => pick(s.a, s.b)} className="clay-inset w-full px-3 py-2 flex items-center justify-between text-left">
                <span><b>{s.a}</b> <span style={{ color: 'var(--ink-soft)' }}>vs</span> <b>{s.b}</b></span>
                <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--ink-soft)' }}>{s.by} · 고르기 →</span>
              </button>
            ))}
            {!suggestions.length && <p className="text-sm py-2" style={{ color: 'var(--ink-soft)' }}>아직 제안이 없어요. 참가자가 질문을 던질 수 있어요.</p>}
          </div>
        </div>
      )}

      {reveal && (
        <>
          <div className="mt-4 flex items-center justify-center gap-6 font-display text-4xl">
            <span style={{ color: target === 'A' ? 'var(--c-coral)' : 'var(--c-sky)' }}>{q?.a || 'A'} {a}</span>
            <span style={{ color: 'var(--ink-soft)' }}>vs</span>
            <span style={{ color: target === 'B' ? 'var(--c-coral)' : 'var(--c-pink)' }}>{q?.b || 'B'} {b}</span>
          </div>
          {target ? (
            <>
              <p className="mt-2 font-bold" style={{ color: 'var(--c-coral)' }}>{modeLabel}는 <b>{target === 'A' ? q?.a || 'A' : q?.b || 'B'}</b> · {modeLabel}가 가장 많은 팀이 벌칙! 🍺</p>
              <div className="mt-3 grid gap-3 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                {teams.map((t) => {
                  const n = byTeam[t.id] || 0
                  const top = n > 0 && n === topN
                  return (
                    <div key={t.id} className="clay p-3" style={{ background: top ? 'var(--c-coral)' : 'var(--surface)', color: top ? '#fff' : 'var(--ink)' }}>
                      <div className="font-display" style={{ color: top ? '#fff' : t.color }}>{t.name}</div>
                      <div className="font-display text-4xl mt-1">{n}명</div>
                      {top && <div className="mt-1 font-bold">🍺 최다 {modeLabel}!</div>}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="mt-4 font-display text-2xl" style={{ color: 'var(--ink-soft)' }}>동수! {modeLabel} 없음 🤝</p>
          )}
        </>
      )}

      {meta.roundStatus === 'open' && <p className="mt-6" style={{ color: 'var(--ink-soft)' }}>응답 수집 중… {modeLabel}를 피해라!</p>}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mode = useValue(`${base}/mode`) || 'minority'
  const q = useValue(`${base}/q`)
  const mine = useValue(`${base}/choice/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'

  const [pa, setPa] = useState('')
  const [pb, setPb] = useState('')
  const [sent, setSent] = useState(false)
  const propose = () => {
    if (!pa.trim() || !pb.trim()) return
    dbPush(`${base}/suggestions`, { a: pa.trim(), b: pb.trim(), by: me.nickname })
    setPa('')
    setPb('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }

  const banner =
    mode === 'minority'
      ? { text: '🎯 소수파가 벌칙! 다수파에 붙어라', color: 'var(--c-grape)' }
      : { text: '👥 다수파가 벌칙! 소수파에 붙어라', color: 'var(--c-coral)' }

  return (
    <div className="text-center">
      <div className="clay-inset px-3 py-2 mb-3 font-bold text-sm" style={{ color: banner.color }}>{banner.text}</div>

      {staged ? (
        <div>
          <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>진행자가 질문 고르는 중… 질문을 제안해보세요!</p>
          <div className="flex gap-2 items-center">
            <input value={pa} onChange={(e) => setPa(e.target.value)} placeholder="A" className="clay-inset flex-1 px-3 py-2 text-center" />
            <span className="font-display" style={{ color: 'var(--ink-soft)' }}>vs</span>
            <input value={pb} onChange={(e) => setPb(e.target.value)} placeholder="B" className="clay-inset flex-1 px-3 py-2 text-center" onKeyDown={(e) => e.key === 'Enter' && propose()} />
          </div>
          <Button className="mt-2 w-full" onClick={propose} disabled={!pa.trim() || !pb.trim()}>{sent ? '제안됨 💡' : '질문 제안'}</Button>
        </div>
      ) : (
        <>
          <p className="mb-3 font-display text-lg">{q?.a || 'A'} <span style={{ color: 'var(--ink-soft)' }}>vs</span> {q?.b || 'B'}</p>
          <div className="grid grid-cols-2 gap-3">
            {['A', 'B'].map((v, i) => {
              const label = i === 0 ? q?.a : q?.b
              return (
                <button
                  key={v}
                  onClick={() => open && dbSet(`${base}/choice/${me.id}`, v)}
                  disabled={!open}
                  className="h-40 rounded-3xl font-display clay-btn flex flex-col items-center justify-center gap-1"
                  style={mine === v ? { background: i === 0 ? 'var(--c-sky)' : 'var(--c-pink)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  <span className="text-2xl opacity-70">{v}</span>
                  <span className="text-2xl px-2 text-center leading-tight">{label || v}</span>
                </button>
              )
            })}
          </div>
          {mine && <p className="mt-3 text-sm" style={{ color: reveal ? 'var(--ink-soft)' : 'var(--c-mint)' }}>내 선택: {mine === 'A' ? q?.a || 'A' : q?.b || 'B'}{reveal ? ' · 결과는 메인 화면!' : ' · 변경 가능'}</p>}
        </>
      )}
    </div>
  )
}

export default {
  id: 'battle',
  name: '밸런스 배틀',
  emoji: '⚖️',
  tagline: '소수파 vs 다수파 · 질문 제안',
  genres: ['mind'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
