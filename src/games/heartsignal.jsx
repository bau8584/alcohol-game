// 하트 시그널 — 밤의 피날레. 각자 '가진 하트(전역 재화)'를 마음에 드는 사람에게 몰래 보내고,
// 공개 때 '양방향(서로 보낸)'만 💘 매칭으로 뜬다. 짝사랑(일방)은 아무에게도 안 보임(프라이버시).
// 하트는 방 전역 재화(players/{id}/hearts): 입장 시 기본 지급 + 호스트가 참가자 관리에서 추가.
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'

// sent = { fromId: { toId: count } } → 양방향 매칭 쌍, 수신 개수
function analyze(sentRaw, players) {
  const sent = sentRaw || {}
  const has = (a, b) => (sent[a]?.[b] || 0) > 0
  const ids = players.map((p) => p.id)
  const nameOf = Object.fromEntries(players.map((p) => [p.id, p.nickname]))

  const matches = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j]
      if (has(a, b) && has(b, a)) matches.push([nameOf[a] || '?', nameOf[b] || '?'])
    }
  }
  const received = {}
  Object.values(sent).forEach((m) => Object.entries(m || {}).forEach(([to, c]) => { received[to] = (received[to] || 0) + (c || 0) }))
  const sentCount = Object.keys(sent).filter((f) => Object.values(sent[f] || {}).some((c) => c > 0)).length
  return { matches, received, sentCount }
}

/* ═══════════════ 호스트 ═══════════════ */
function HostView({ base, meta, players }) {
  const sentRaw = useValue(`${base}/sent`)
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'

  const { matches, sentCount } = useMemo(() => analyze(sentRaw, players), [sentRaw, players])
  const zeroHearts = players.filter((p) => (p.hearts || 0) === 0).length

  if (staged) {
    return (
      <div className="text-center">
        <div className="text-5xl">💘</div>
        <p className="mt-2 font-display text-xl">하트 시그널</p>
        <p className="mt-1 text-sm max-w-md mx-auto" style={{ color: 'var(--ink-soft)' }}>
          각자 <b>가진 하트(💗)</b>를 마음에 드는 사람에게 몰래 보냅니다.<br />
          <b>서로 보낸 사람끼리만</b> 💘 매칭으로 공개돼요. 짝사랑은 아무에게도 안 보여요.
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
          하트는 <b>방 전역 재화</b>예요.{zeroHearts > 0 ? ` (하트 0개 ${zeroHearts}명)` : ''} 하트를 더 주려면 <b>참가자 관리</b>에서 💗를 눌러요.
        </p>
        <p className="mt-4 text-sm font-display" style={{ color: 'var(--c-pink)' }}>▶ 시작을 누르면 각자 가진 하트로 보냅니다 💌</p>
      </div>
    )
  }

  if (!reveal) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl animate-pulse">💌</div>
        <p className="mt-3 font-display text-2xl">{sentCount}/{players.length} 전송</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>다들 몰래 하트 보내는 중… 👁 ‘공개’로 매칭 발표!</p>
      </div>
    )
  }

  // 공개 — 양방향 매칭만
  return (
    <div className="text-center">
      <div className="font-display text-2xl">💘 오늘의 매칭 발표</div>
      {matches.length > 0 ? (
        <div className="mt-4 space-y-2 max-w-md mx-auto">
          {matches.map(([a, b], i) => (
            <div key={i} className="clay py-3 px-4 font-display text-2xl animate-pop" style={{ background: 'var(--c-pink)', color: '#fff' }}>
              {a} <span className="text-xl">💘</span> {b}
            </div>
          ))}
          <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>서로 하트를 보낸 커플이에요! 🎉</p>
        </div>
      ) : (
        <p className="mt-6 font-display text-xl" style={{ color: 'var(--ink-soft)' }}>이번엔 매칭이 없네요… 🥲</p>
      )}
      <p className="mt-4 text-xs" style={{ color: 'var(--ink-soft)' }}>짝사랑(일방)은 공개되지 않아요. 각자 받은 하트 수는 본인 폰에서 확인!</p>
    </div>
  )
}

/* ═══════════════ 플레이어 ═══════════════ */
function PlayerView({ base, meta, players, me }) {
  const total = me.hearts || 0 // 전역 하트 잔액이 곧 보낼 수 있는 하트
  const mySent = useValue(`${base}/sent/${me.id}`) || {}
  const sentRaw = useValue(`${base}/sent`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'

  const candidates = players.filter((p) => p.id !== me.id)
  const used = Object.values(mySent).reduce((a, c) => a + (c || 0), 0)
  const remain = Math.max(0, total - used)
  const give = (cid, d) => {
    const cur = mySent[cid] || 0
    if (d > 0 && remain <= 0) return
    dbSet(`${base}/sent/${me.id}/${cid}`, Math.max(0, cur + d))
  }

  if (reveal) {
    const { matches, received } = analyze(sentRaw, players)
    const myName = me.nickname
    const myMatches = matches.filter(([a, b]) => a === myName || b === myName).map(([a, b]) => (a === myName ? b : a))
    const got = received[me.id] || 0
    return (
      <div className="text-center">
        <div className="clay py-6" style={{ background: myMatches.length ? 'var(--c-pink)' : 'var(--surface)', color: myMatches.length ? '#fff' : 'var(--ink)' }}>
          {myMatches.length > 0 ? (
            <>
              <div className="text-5xl animate-pop">💘</div>
              <div className="font-display text-2xl mt-2">매칭 성공!</div>
              <div className="mt-1 font-display text-xl">{myMatches.join(', ')} 와(과) 서로!</div>
            </>
          ) : (
            <>
              <div className="text-5xl">💌</div>
              <div className="font-display text-xl mt-2">이번엔 매칭이 없어요</div>
            </>
          )}
        </div>
        <p className="mt-3 font-display text-lg">나에게 온 하트 <b style={{ color: 'var(--c-pink)' }}>💗 {got}개</b></p>
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>누가 보냈는지는 비밀이에요 🤫</p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">💘</div>
        <p className="mt-3 font-display text-xl">진행자가 하트 시그널 준비 중…</p>
      </div>
    )
  }

  if (total <= 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🥲</div>
        <p className="mt-3 font-display text-xl">보낼 하트가 없어요</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자에게 하트를 받아보세요 💗</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="font-display text-lg">💘 마음에 드는 사람에게 하트를!</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>남은 하트 <b style={{ color: 'var(--c-pink)' }}>💗 {remain}</b> / {total} · 한 사람에게 몰아줘도 OK</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {candidates.map((p) => {
          const n = mySent[p.id] || 0
          return (
            <div key={p.id} className="clay-inset px-2 py-2 flex items-center justify-between gap-1" style={n > 0 ? { outline: '2px solid var(--c-pink)' } : {}}>
              <span className="font-bold truncate">{p.nickname}{n > 0 && <span style={{ color: 'var(--c-pink)' }}> 💗{n}</span>}</span>
              <span className="flex gap-1 shrink-0">
                <button onClick={() => give(p.id, -1)} disabled={!n} className="clay-btn w-7 h-7 disabled:opacity-30" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>−</button>
                <button onClick={() => give(p.id, 1)} disabled={remain <= 0} className="clay-btn w-7 h-7 disabled:opacity-30" style={{ background: 'var(--c-pink)', color: '#fff' }}>+</button>
              </span>
            </div>
          )
        })}
        {!candidates.length && <p className="col-span-2 py-6 text-sm" style={{ color: 'var(--ink-soft)' }}>보낼 사람이 없어요.</p>}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
        {used > 0 ? '전송 중 · 공개 전까지 변경 가능 (비밀)' : '안 보내도 돼요. 서로 보낸 사람만 매칭으로 공개돼요.'}
      </p>
    </div>
  )
}

export default {
  id: 'heartsignal',
  name: '하트 시그널',
  emoji: '💘',
  tagline: '몰래 하트 보내기 · 서로 보내면 매칭 공개',
  genres: ['party'],
  traits: ['anon'],
  HostView,
  PlayerView,
}
