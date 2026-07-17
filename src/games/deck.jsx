// 덱 프리젠터 엔진 — 카드를 한 장씩 넘기며 보여주는 게임의 공통 골격.
// createDeckGame(config)로 게임 모듈을 만든다. 몸으로말해요(연기자 폰 제시) /
// 이어말하기·줄줄이(호스트 제시) 를 모두 커버.
//
// config = {
//   id, name, emoji, tagline,
//   target: 'host' | 'actor',        // 카드가 어디에 뜨는가
//   timer: 초 | null,                 // 있으면 타이머 버튼 노출
//   guide: '플레이어 대기 안내문',
//   collect: { perPlayer, placeholder } | null,  // 참가자가 제시어를 직접 채우는 모드
//   subsets: [{ key, label, cards: [{ hint?, text?, answer? }] }],
// }
// card 필드: hint=붉은 글자(말해도 됨) / text=항상 보이는 제시어 / answer=정답(공개 전 숨김)
//
// 고정 덱은 한 번 돌면 정답을 다 알아버리는 소모성이라, collect가 있으면
// '🙋 우리끼리 제시어'로 참가자가 각자 폰에 넣은 걸 섞어서 덱을 만들 수 있다.
import { useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbPush, dbRemove, toList } from '../lib/db'
import Countdown from '../components/Countdown'
import { Button } from '../components/ui'

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HintPill({ hint }) {
  if (!hint) return null
  return (
    <span className="inline-block clay-inset px-3 py-1 mb-2 text-sm font-bold" style={{ color: 'var(--c-coral)' }}>
      🔴 {hint} <span style={{ color: 'var(--ink-soft)' }}>(말해도 OK)</span>
    </span>
  )
}

const OWN = '__own' // 참가자가 채운 덱

export function createDeckGame(config) {
  const { target = 'host', timer = null, subsets, guide, collect = null } = config
  const subsetByKey = (k) => subsets.find((s) => s.key === k) || null

  /* ───────── 호스트 ───────── */
  function HostView({ base, meta, players }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const revealed = useValue(`${base}/revealed`)
    const actorId = useValue(`${base}/actorId`)
    const endsAt = useValue(`${base}/endsAt`)
    const collecting = useValue(`${base}/collecting`)
    const poolRaw = useValue(`${base}/pool`)
    const ownCards = useValue(`${base}/ownCards`)

    const pool = useMemo(() => toList(poolRaw), [poolRaw])
    const contributors = useMemo(() => new Set(pool.map((c) => c.pid)).size, [pool])

    // 참가자 제시어 수집 중
    if (collecting) {
      const build = () => {
        const cards = shuffle(pool.length).map((i) => ({ answer: pool[i].t }))
        dbSet(base, { subset: OWN, ownCards: cards, order: shuffle(cards.length), idx: 0, revealed: false, actorId: null, endsAt: null })
      }
      return (
        <div className="text-center">
          <p className="font-display text-2xl">🙋 각자 폰에 제시어를 넣어주세요!</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            1인당 최대 {collect.perPlayer}개 · 내용은 아무에게도 안 보여요 🤫
          </p>
          <div className="clay-inset mt-4 py-8">
            <div className="font-display text-6xl">{pool.length}<span className="text-2xl" style={{ color: 'var(--ink-soft)' }}>장</span></div>
            <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{contributors}명이 참여했어요</div>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => dbSet(base, null)}>취소</Button>
            <Button variant="ok" onClick={build} disabled={!pool.length}>🎬 이걸로 시작 ({pool.length}장)</Button>
          </div>
        </div>
      )
    }

    // 세트 선택 전
    if (!subset) {
      return (
        <div className="text-center">
          <p className="font-display text-xl mb-4">{config.emoji} 어떤 세트로 할까요?</p>
          {collect && (
            <button
              onClick={() => dbSet(base, { collecting: true })}
              className="clay-btn py-4 px-6 font-display text-xl mb-3 w-full max-w-2xl mx-auto block"
              style={{ background: 'var(--c-grape)', color: '#fff' }}
            >
              🙋 우리끼리 제시어로 하기
              <div className="text-xs mt-1 opacity-90">참가자가 직접 채운 덱 · 매번 새로움</div>
            </button>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {subsets.filter((s) => meta?.adultEnabled || !s.adult).map((s) => (
              <button
                key={s.key}
                onClick={() => dbSet(base, { subset: s.key, order: shuffle(s.cards.length), idx: 0, revealed: false, actorId: null, endsAt: null })}
                className="clay-btn py-5 font-display text-xl"
                style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
              >
                {s.label}
                <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{s.cards.length}장</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    const deck = subset === OWN ? { label: '🙋 우리끼리', cards: ownCards || [] } : subsetByKey(subset)
    const cards = deck?.cards || []
    const total = order?.length || 0
    const cur = cards[order?.[idx]]
    const atEnd = idx >= total - 1

    const go = (d) => {
      const ni = Math.min(total - 1, Math.max(0, idx + d))
      dbUpdate(base, { idx: ni, revealed: false, endsAt: null })
    }
    const reshuffle = () => dbUpdate(base, { order: shuffle(total), idx: 0, revealed: false, endsAt: null })
    const actorName = players.find((p) => p.id === actorId)?.nickname

    return (
      <div className="text-center">
        <div className="flex items-center justify-between mb-3">
          <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {idx + 1}/{total}</span>
          <button onClick={() => dbSet(base, null)} className="text-sm clay-btn px-3 py-1" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>🔄 다른 세트</button>
        </div>

        {/* 연기자 지정 (actor 모드) */}
        {target === 'actor' && (
          <div className="mb-3">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>🎭 연기자를 누르면 그 사람 폰에만 정답이 떠요</div>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dbSet(`${base}/actorId`, p.id)}
                  className="clay-btn px-3 py-1.5 text-sm font-bold"
                  style={actorId === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  {actorId === p.id ? '🎭 ' : ''}{p.nickname}
                </button>
              ))}
              {players.length === 0 && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
            </div>
          </div>
        )}

        {/* 카드 */}
        <div className="clay-inset py-8 px-4 min-h-[140px] flex flex-col items-center justify-center">
          <HintPill hint={cur?.hint} />
          {target === 'actor' ? (
            actorId ? (
              <div className="font-display text-2xl" style={{ color: 'var(--ink-soft)' }}>
                🙈 정답은 <b style={{ color: 'var(--ink)' }}>{actorName}</b> 님 폰에!
              </div>
            ) : (
              <div className="font-display text-xl" style={{ color: 'var(--ink-soft)' }}>위에서 연기자를 먼저 골라주세요</div>
            )
          ) : (
            <>
              {cur?.text && <div className="font-display text-4xl leading-tight">{cur.text}</div>}
              {cur?.answer && (revealed
                ? <div className="font-display text-3xl mt-3 animate-pop" style={{ color: 'var(--c-mint)' }}>→ {cur.answer}</div>
                : <div className="mt-3 text-2xl" style={{ color: 'var(--ink-soft)' }}>❓</div>)}
            </>
          )}
          {/* actor 모드에서도 호스트가 정답 확인용 */}
          {target === 'actor' && revealed && cur?.answer && (
            <div className="font-display text-2xl mt-3 animate-pop" style={{ color: 'var(--c-mint)' }}>정답: {cur.answer}</div>
          )}
          {endsAt && <div className="mt-3"><Countdown endsAt={endsAt} size="text-4xl" /></div>}
        </div>

        {/* 컨트롤 */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Button variant="ghost" onClick={() => go(-1)} disabled={idx === 0}>◀ 이전</Button>
          {cur?.answer && !revealed && <Button variant="warn" onClick={() => dbSet(`${base}/revealed`, true)}>👁 정답</Button>}
          {timer && <Button variant="ok" onClick={() => dbSet(`${base}/endsAt`, Date.now() + timer * 1000)}>⏱ {timer}초</Button>}
          {atEnd ? (
            <Button variant="primary" onClick={reshuffle}>🔀 다시 섞기</Button>
          ) : (
            <Button variant="primary" onClick={() => go(1)}>다음 ▶</Button>
          )}
        </div>
      </div>
    )
  }

  /* ───────── 플레이어 ───────── */
  function PlayerView({ base, players, me }) {
    const subset = useValue(`${base}/subset`)
    const order = useValue(`${base}/order`)
    const idx = useValue(`${base}/idx`) || 0
    const actorId = useValue(`${base}/actorId`)
    const endsAt = useValue(`${base}/endsAt`)
    const collecting = useValue(`${base}/collecting`)
    const poolRaw = useValue(`${base}/pool`)
    const ownCards = useValue(`${base}/ownCards`)
    const [text, setText] = useState('')

    const mine = useMemo(() => toList(poolRaw).filter((c) => c.pid === me.id), [poolRaw, me.id])

    // 제시어 수집 중 — 내가 넣은 것만 보이고, 남의 것은 안 보인다.
    if (collecting) {
      const left = collect.perPlayer - mine.length
      const add = () => {
        const t = text.trim()
        if (!t || left <= 0) return
        dbPush(`${base}/pool`, { t, pid: me.id })
        setText('')
      }
      return (
        <div className="text-center">
          <p className="font-display text-xl">🙋 제시어를 넣어주세요</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {left > 0 ? `${left}개 더 넣을 수 있어요` : '다 넣었어요! 호스트를 기다려주세요'}
          </p>
          {left > 0 && (
            <>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-3 w-full clay-inset px-4 py-4 text-xl text-center"
                placeholder={collect.placeholder || '제시어 입력'}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <Button className="mt-2 w-full" onClick={add} disabled={!text.trim()}>추가</Button>
            </>
          )}
          <div className="mt-4 space-y-1.5">
            {mine.map((c) => (
              <div key={c.id} className="clay-inset px-3 py-2 flex items-center gap-2">
                <span className="flex-1 min-w-0 truncate text-left">{c.t}</span>
                <button onClick={() => dbRemove(`${base}/pool/${c.id}`)} className="text-sm shrink-0" style={{ color: 'var(--c-coral)' }}>삭제</button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>내가 낸 제시어가 나한테 걸릴 수도 있어요 😈</p>
        </div>
      )
    }

    if (!subset) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl">{config.emoji}</div>
          <p className="mt-3 font-display text-xl">호스트가 세트를 고르는 중…</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
        </div>
      )
    }

    // 호스트 제시형 → 플레이어는 관전
    if (target !== 'actor') {
      return (
        <div className="text-center py-12">
          <div className="text-5xl">📺</div>
          <p className="mt-3 font-display text-xl">{guide || '메인 화면을 보세요!'}</p>
        </div>
      )
    }

    // 연기자 폰 제시형
    if (!actorId) {
      return (
        <div className="text-center py-12">
          <div className="text-5xl">🎭</div>
          <p className="mt-3 font-display text-xl">호스트가 연기자를 정하는 중…</p>
        </div>
      )
    }
    if (actorId !== me.id) {
      const actorName = players.find((p) => p.id === actorId)?.nickname || '연기자'
      return (
        <div className="text-center py-12">
          <div className="text-6xl animate-pop">🎭</div>
          <p className="mt-3 font-display text-2xl">{actorName} 님이 연기 중!</p>
          <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>큰 소리로 외쳐서 맞혀보세요 📣</p>
          {endsAt && <div className="mt-4"><Countdown endsAt={endsAt} size="text-4xl" /></div>}
        </div>
      )
    }

    // 내가 연기자
    const deck = subset === OWN ? { cards: ownCards || [] } : subsetByKey(subset)
    const cards = deck?.cards || []
    const total = order?.length || 0
    const cur = cards[order?.[idx]]
    const atEnd = idx >= total - 1
    const next = () => {
      const ni = Math.min(total - 1, idx + 1)
      dbUpdate(base, { idx: ni, revealed: false, endsAt: null })
    }
    return (
      <div className="text-center">
        <div className="clay p-6" style={{ background: 'var(--c-grape)', color: '#fff' }}>
          <div className="opacity-80 text-sm">🎭 나만 보는 정답 · 말·소리 없이 몸으로!</div>
          {cur?.hint && <div className="mt-2 text-sm opacity-90">🔴 {cur.hint} (말해도 OK)</div>}
          <div className="font-display text-4xl mt-2 leading-tight">{cur?.answer || cur?.text}</div>
        </div>
        {endsAt && <div className="mt-4"><Countdown endsAt={endsAt} size="text-4xl" /></div>}
        <div className="flex gap-2 mt-4">
          <Button variant="ok" className="flex-1" onClick={next}>✅ 맞혔다!</Button>
          <Button variant="ghost" className="flex-1" onClick={next}>⏭ 패스</Button>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{idx + 1}/{total}{atEnd ? ' · 마지막 카드' : ''}</p>
      </div>
    )
  }

  return {
    id: config.id,
    name: config.name,
    emoji: config.emoji,
    tagline: config.tagline,
    genres: config.genres,
    traits: config.traits,
    controls: { mode: 'self' },
    HostView,
    PlayerView,
  }
}
