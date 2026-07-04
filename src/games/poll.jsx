// 다수결 심리전 — 각자 폰에서 몰래 예/아니오. 종료(공개) 시 숫자만 공개.
// 기본 익명. 호스트가 '이름 밝히기'를 누르면 누가 뭘 골랐는지 이름이 드러남.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

// 예전(문자열) / 새 형식 모두 지원
const valOf = (v) => (typeof v === 'string' ? v : v?.v || null)

// 랜덤 질문 풀 — 🎲 일반(흰색) / 🎲 19금(빨강)으로 구분
const NORMAL = [
  '오늘 여기서 마음에 드는 사람 있는 사람?',
  '최근 한 달 안에 소개팅 해본 사람?',
  '지금 썸 타는 사람 있는 사람?',
  '술 마시고 필름 끊겨본 적 있는 사람?',
  '첫사랑이랑 다시 만나고 싶은 사람?',
  '폰에 전 애인 번호 아직 저장돼 있는 사람?',
  '전 애인 SNS 몰래 본 적 있는 사람?',
  '여기 있는 누군가한테 서운한 적 있는 사람?',
  '이 중에 손절하고 싶은 사람 있는 사람?',
  '몰래 다이어트 중인 사람?',
  '다음 MT 안 오고 싶은 사람?',
  '가족한테 거짓말하고 나온 사람?',
  '오늘 아침 세수 안 하고 온 사람?',
  '통장에 지금 10만 원 없는 사람?',
  '새벽 감성에 이불킥한 적 있는 사람?',
  '단톡방 알림 꺼둔 사람?',
  '전 애인 결혼식 가줄 수 있는 사람?',
  '무면허인 사람?',
  '민증 사진 흑역사인 사람?',
  '이번 주 운동 0회인 사람?',
]
const ADULT = [
  '오늘 밤 이 중 누군가랑 자고 싶은 사람?',
  '최근 야한 꿈 꾼 사람?',
  '폰에 야한 사진·영상 있는 사람?',
  '원나잇 해본 적 있는 사람?',
  '모텔 가본 적 있는 사람?',
  '첫 경험이 스무 살 전인 사람?',
  '전 애인이 5명 이상인 사람?',
  '지금 승부 속옷 입고 온 사람?',
  '여기 있는 사람 중 야한 상상 해본 대상 있는 사람?',
  '술 취해서 아무하고나 스킨십한 적 있는 사람?',
  '클럽·헌팅포차에서 번호 따인 적 있는 사람?',
  '헤어진 사람이랑 다시 자본 적 있는 사람?',
  '19금 웹툰·영상 즐겨 보는 사람?',
  '이성 친구랑 선 넘은 적 있는 사람?',
  '지금 이 자리에서 키스하고 싶은 사람 있는 사람?',
  '금욕 3개월 넘은 사람?',
  '전 연인과의 야한 사진 아직 안 지운 사람?',
  '야외에서 스릴 즐겨본 적 있는 사람?',
  '썸만 타다 이미 다 해본 적 있는 사람?',
  '지금 속옷 색 기억 안 나는 사람?',
]

function HostView({ base, meta, players, writePrompt }) {
  const raw = useValue(`${base}/vote`)
  const [showNames, setShowNames] = useState(false)
  const [q, setQ] = useState(meta.prompt || '')
  useEffect(() => { setQ(meta.prompt || '') }, [meta.roundSeq]) // 새 라운드마다 입력창 리셋
  const writeQ = (v) => { setQ(v); writePrompt?.(v) }
  const rollFrom = (arr) => writeQ(arr[Math.floor(Math.random() * arr.length)])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const { yes, no, total, votedIds, yesNames, noNames } = useMemo(() => {
    const list = toList(raw).map((e) => ({ id: e.id, v: valOf(e.value ?? e) })).filter((x) => x.v)
    const y = list.filter((x) => x.v === 'yes')
    const n = list.filter((x) => x.v === 'no')
    return {
      yes: y.length,
      no: n.length,
      total: list.length,
      votedIds: new Set(list.map((x) => x.id)),
      yesNames: y.map((x) => byId[x.id]?.nickname).filter(Boolean),
      noNames: n.map((x) => byId[x.id]?.nickname).filter(Boolean),
    }
  }, [raw, byId])
  const reveal = meta.roundStatus === 'reveal'
  const max = Math.max(1, yes, no)
  const notYet = players.filter((p) => !votedIds.has(p.id))

  return (
    <div className="text-center">
      {!reveal && (
        <div className="mb-3 max-w-md mx-auto">
          <input value={q} onChange={(e) => writeQ(e.target.value)} placeholder="예/아니오 질문 (직접 입력 또는 주사위)" className="clay-inset w-full px-3 py-2.5 text-center" />
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={() => rollFrom(NORMAL)} className="clay-btn px-4 py-2 font-display" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>🎲 일반</button>
            <button onClick={() => rollFrom(ADULT)} className="clay-btn px-4 py-2 font-display" style={{ background: 'var(--c-coral)', color: '#fff' }}>🎲 19금</button>
          </div>
        </div>
      )}
      <div className="font-display text-2xl">{meta.prompt || '예/아니오 질문을 입력하세요'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{total}/{players.length} 응답 {reveal ? '· 종료' : '· 비밀'}</div>

      {reveal ? (
        <div className="mt-5 max-w-md mx-auto space-y-3">
          {[
            { key: 'yes', label: '⭕ 예', n: yes, color: 'var(--c-mint)', names: yesNames },
            { key: 'no', label: '❌ 아니오', n: no, color: 'var(--c-coral)', names: noNames },
          ].map((r) => (
            <div key={r.key}>
              <div className="flex justify-between font-bold">
                <span>{r.label}</span>
                <span className="font-display text-2xl">{r.n}명</span>
              </div>
              <div className="mt-1 h-8 clay-inset relative overflow-hidden">
                <div className="absolute inset-y-1 left-1 rounded-full transition-all duration-500" style={{ width: `calc(${(r.n / max) * 100}% - 8px)`, background: r.color, opacity: 0.9 }} />
              </div>
              {showNames && r.names.length > 0 && (
                <div className="mt-1 text-sm text-left" style={{ color: r.color }}>🙋 {r.names.join(', ')}</div>
              )}
            </div>
          ))}
          <Button variant={showNames ? 'primary' : 'ghost'} onClick={() => setShowNames((s) => !s)}>
            {showNames ? '🙈 이름 가리기' : '🙋 이름 밝히기'}
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <p style={{ color: 'var(--ink-soft)' }}>비밀 응답 수집 중…</p>
          {notYet.length > 0 && (
            <div className="mt-3">
              <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>아직 응답 안 함 ({notYet.length})</div>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
                {notYet.map((p) => (
                  <span key={p.id} className="clay-inset px-2.5 py-1 text-sm">{p.nickname}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const mine = valOf(useValue(`${base}/vote/${me.id}`))
  const open = meta.roundStatus === 'open'
  return (
    <div className="text-center">
      <p className="mb-3" style={{ color: 'var(--ink-soft)' }}>{meta.prompt || '예/아니오'}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { v: 'yes', label: '⭕ 예', color: 'var(--c-mint)' },
          { v: 'no', label: '❌ 아니오', color: 'var(--c-coral)' },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => open && dbSet(`${base}/vote/${me.id}`, o.v)}
            disabled={!open}
            className="h-40 rounded-3xl font-display text-3xl clay-btn"
            style={mine === o.v ? { background: o.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!open && <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>종료됨 · 수정 불가 🔒</p>}
      {open && mine && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>응답 완료 · 변경 가능 (비밀)</p>}
    </div>
  )
}

export default {
  id: 'poll',
  name: '다수결 심리전',
  emoji: '🗳️',
  tagline: '몇 명이나? · 익명 집계',
  controls: { mode: 'toggle', startLabel: '▶ 시작', stopLabel: '⏹ 종료', resetLabel: '🔄 새 질문' },
  HostView,
  PlayerView,
}
