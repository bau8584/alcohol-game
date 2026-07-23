// 고르기 — 사람 지목. 시작 → 공개(결과). 참가자가 질문 제안 → 호스트가 골라 씀.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, toList } from '../lib/db'
import { Button } from '../components/ui'
import QpoolPick from '../components/QpoolPick'

const MAX_PICK = 5
// 한 참가자의 선택을 배열로 정규화 (신 구조 {tid:true} / 구 구조 단일 문자열 모두 지원)
const selectedIds = (sel) =>
  typeof sel === 'string' ? [sel] : sel && typeof sel === 'object' ? Object.keys(sel).filter((k) => sel[k]) : []

// 질문 풀 — 🎲 일반 / 🎲 19금(빨강)
// 고르기는 '직접 지목해서 놀리는 로스트·상황 반응'에 특화.
// (집단 평판 예측형은 '군중심리(herd)'로 분리 — 중복 최소화)
const NORMAL = [
  '오늘 제일 먼저 취할 것 같은 사람?',
  '술 마시면 제일 시끄러워지는 사람?',
  '술 취하면 제일 개차반 되는 사람?',
  '주사가 제일 심할 것 같은 사람?',
  '여기서 제일 코 골 것 같은 사람?',
  '자취방이 제일 더러울 것 같은 사람?',
  '노래방 가면 마이크 안 놓을 사람?',
  '치킨 시키면 혼자 다 먹을 것 같은 사람?',
  '술값 계산할 때 슬쩍 화장실 가는 사람?',
  '취하면 갑자기 철학자 되는 사람?',
  '연락 제일 안 되는 사람?',
  '방 청소 절대 안 할 것 같은 사람?',
  '갑자기 사라져도 아무도 모를 것 같은 사람?',
  '몰래 성형했을 것 같은 사람?',
  '검색 기록 절대 못 보여줄 것 같은 사람?',
  '흑역사가 제일 많을 것 같은 사람?',
  '술 마시면 울 것 같은 사람?',
  '자면서 침 흘릴 것 같은 사람?',
  '엄마한테 아직 용돈 받을 것 같은 사람?',
  '전 애인한테 아직 미련 남은 사람?',
  '첫사랑 아직 못 잊었을 것 같은 사람?',
  '연애편지 손발 오그라들게 쓸 것 같은 사람?',
  '방금 몰래 방귀 뀐 것 같은 사람?',
  '지금 취한 척 연기하는 것 같은 사람?',
  '벌칙 걸리면 제일 오버할 것 같은 사람?',
  '여기서 제일 허세 심한 사람?',
  '오늘 제일 대충 씻고 나온 것 같은 사람?',
  '자기 얘기 나오면 제일 뜨끔할 것 같은 사람?',
]
const ADULT = [
  '오늘 이 중에 한 명이랑 자야 한다면?',
  '연애하면 제일 밝힐 것 같은 사람?',
  '첫 경험이 제일 빨랐을 것 같은 사람?',
  '모텔 제일 자주 갈 것 같은 사람?',
  '술 취하면 아무한테나 들이댈 것 같은 사람?',
  '전 애인이 제일 많을 것 같은 사람?',
  '하룻밤 상대로 제일 인기 많을 것 같은 사람?',
  '침대에서 제일 시끄러울 것 같은 사람?',
  '가장 은밀한 취향을 가졌을 것 같은 사람?',
  '옛날에 클럽 죽돌이/죽순이였을 것 같은 사람?',
  'MT 끝나고 몰래 둘이 연락할 것 같은 사람?',
  '다음에 커플 될 것 같은 사람?',
  '지금 이 자리에서 키스한다면 누구랑?',
  '전 애인이랑 다시 자보고 싶어 할 것 같은 사람?',
  '스킨십 진도 제일 빠를 것 같은 사람?',
  '여기서 제일 밝히는 티 나는 사람?',
  '지금 승부 속옷 입고 왔을 것 같은 사람?',
  '몸매 관리 제일 열심히 할 것 같은 사람?',
]

function HostView({ roomId, base, meta, players, writePrompt }) {
  const raw = useValue(`${base}/pick`)
  const maxPick = useValue(`${base}/maxPick`) || 1
  const suggestions = toList(useValue(`${base}/suggestions`))
  const nameOf = useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
  const ranked = useMemo(() => {
    const counts = {}
    Object.values(raw || {}).forEach((sel) => selectedIds(sel).forEach((tid) => (counts[tid] = (counts[tid] || 0) + 1)))
    return players.map((p) => ({ ...p, votes: counts[p.id] || 0 })).sort((a, b) => b.votes - a.votes)
  }, [raw, players])
  const votedIds = useMemo(
    () => new Set(Object.entries(raw || {}).filter(([, sel]) => selectedIds(sel).length > 0).map(([pid]) => pid)),
    [raw]
  )
  const setMax = (d) => dbSet(`${base}/maxPick`, Math.min(MAX_PICK, Math.max(1, maxPick + d)))
  const total = votedIds.size
  const max = Math.max(1, ...ranked.map((r) => r.votes))
  const top = ranked[0]?.votes > 0 ? ranked[0] : null
  const reveal = meta.roundStatus === 'reveal'
  const notYet = players.filter((p) => !votedIds.has(p.id))

  // 질문 입력 로컬 상태 (새 라운드마다 리셋) + 주사위
  const [q, setQ] = useState(meta.prompt || '')
  useEffect(() => { setQ(meta.prompt || '') }, [meta.roundSeq]) // eslint-disable-line
  const writeQ = (v) => { setQ(v); writePrompt?.(v) }
  const rollFrom = (arr) => writeQ(arr[Math.floor(Math.random() * arr.length)])

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
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="clay-inset p-3 mb-3 text-left max-h-40 overflow-y-auto">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>💡 제안된 질문 ({suggestions.length})</div>
          <div className="space-y-1">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => writePrompt(s.text)}
                  className="clay-btn font-display px-2.5 py-1 text-sm shrink-0"
                  style={{ background: 'var(--c-grape)', color: '#fff' }}
                >
                  쓰기
                </button>
                <span className="text-sm truncate">{s.text} <span style={{ color: 'var(--ink-soft)' }}>· {nameOf(s.pid)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between text-sm gap-2" style={{ color: 'var(--ink-soft)' }}>
        <span className="font-display text-lg" style={{ color: 'var(--ink)' }}>{meta.prompt || '질문을 입력/선택하세요'}</span>
        <span className="shrink-0">{total}/{players.length} 지목{!reveal && ' · 진행 중'}</span>
      </div>

      {!reveal && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>지목 인원</span>
          <button onClick={() => setMax(-1)} disabled={maxPick <= 1} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
          <span className="font-display text-xl w-14 text-center">{maxPick}명</span>
          <button onClick={() => setMax(1)} disabled={maxPick >= MAX_PICK} className="w-9 h-9 rounded-full clay-btn text-xl disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>+</button>
        </div>
      )}

      {reveal ? (
        <>
          {top ? (
            <div className="text-center mt-2 clay p-3 max-w-sm mx-auto animate-pop" style={{ background: 'var(--c-coral)', color: '#fff' }}>
              <div className="text-sm opacity-90">🎯 최다 득표 · 당첨!</div>
              <div className="font-display text-4xl">{top.nickname}</div>
              <div className="text-sm opacity-90 mt-0.5">벌칙 / 미션 수행 🍺</div>
            </div>
          ) : null}
          <div className="mt-3 space-y-2 max-w-lg mx-auto">
            {ranked.filter((r) => r.votes > 0).map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="w-24 truncate text-right font-bold">{r.nickname}</span>
                <div className="flex-1 h-7 clay-inset overflow-hidden relative">
                  <div className="absolute inset-y-1 left-1 rounded-full flex items-center justify-end pr-2 text-sm font-bold text-white transition-all duration-500" style={{ width: `calc(${(r.votes / max) * 100}% - 8px)`, background: 'var(--c-grape)' }}>{r.votes}</div>
                </div>
              </div>
            ))}
            {!top && <p className="text-center py-6" style={{ color: 'var(--ink-soft)' }}>지목이 없어요.</p>}
          </div>
        </>
      ) : (
        <div className="text-center mt-4">
          <p className="text-xl font-display" style={{ color: 'var(--ink-soft)' }}>지목 받는 중… 👁 ‘공개’를 누르면 결과</p>
          {notYet.length > 0 ? (
            <div className="mt-3">
              <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>아직 선택 안 함 ({notYet.length})</div>
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
  const mySel = useValue(`${base}/pick/${me.id}`)
  const maxPick = useValue(`${base}/maxPick`) || 1
  const open = meta.roundStatus === 'open'
  const selected = useMemo(() => new Set(selectedIds(mySel)), [mySel])
  const [sug, setSug] = useState('')
  const [openSug, setOpenSug] = useState(false)
  const suggest = () => {
    if (!sug.trim()) return
    dbPush(`${base}/suggestions`, { text: sug.trim(), pid: me.id, ts: Date.now() })
    setSug('')
    setOpenSug(false)
  }
  const toggle = (tid) => {
    if (!open) return
    if (selected.has(tid)) dbUpdate(`${base}/pick/${me.id}`, { [tid]: null })
    else if (selected.size < maxPick) dbUpdate(`${base}/pick/${me.id}`, { [tid]: true })
    else if (maxPick === 1) dbUpdate(`${base}/pick/${me.id}`, { [[...selected][0]]: null, [tid]: true })
  }
  return (
    <div>
      <div className="mb-3">
        {!openSug ? (
          <button className="w-full clay-btn font-display py-2.5 text-base" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }} onClick={() => setOpenSug(true)}>
            💡 질문 제안하기
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={sug}
              onChange={(e) => setSug(e.target.value)}
              placeholder="예: 오늘 제일 웃긴 사람?"
              className="clay-inset flex-1 px-3 py-2.5"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && suggest()}
            />
            <Button onClick={suggest} disabled={!sug.trim()}>제안</Button>
          </div>
        )}
      </div>

      <p className="text-center font-display text-lg">{meta.prompt || '지목할 사람'}</p>
      <p className="text-center text-sm mt-1 mb-2" style={{ color: 'var(--c-coral)' }}>🎯 솔직하게 지목! <b>최다 득표자가 당첨(벌칙)</b> 🍺</p>
      {maxPick > 1 && <p className="text-center mb-3 text-sm font-bold" style={{ color: 'var(--c-grape)' }}>최대 {maxPick}명 지목</p>}
      <div className="grid grid-cols-3 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            disabled={!open || (!selected.has(p.id) && selected.size >= maxPick && maxPick > 1)}
            className="clay-btn py-3 font-display text-base disabled:opacity-50"
            style={selected.has(p.id) ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}{p.id === me.id && ' (나)'}
          </button>
        ))}
      </div>
      {!open && <p className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>공개됨 · 수정 불가 🔒</p>}
      {open && selected.size > 0 && (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--c-mint)' }}>
          {maxPick > 1 ? `${selected.size}/${maxPick}명 선택` : '지목 완료'} · 변경 가능
        </p>
      )}
    </div>
  )
}

export default {
  id: 'pick',
  name: '고르기',
  emoji: '🎯',
  tagline: '지목 여론조사 · 최다 득표자가 당첨(벌칙)',
  genres: ['mind'],
  traits: ['anon', 'solo'],
  controls: { startLabel: '▶ 시작', resetLabel: '🔄 새 질문' },
  HostView,
  PlayerView,
}
