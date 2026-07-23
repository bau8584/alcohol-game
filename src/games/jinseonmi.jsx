// 진선미 — 익명 질문 + 심사. 질문자가 특정인을 지목해 익명 질문을 보내면,
// 지목당한 사람이 전체 목록에서 진(🥇)·선(🥈)·미(🥉)를 뽑는다.
// 호스트 화면엔 '진선미'만 공개되고 '질문'은 비공개. 궁금하면 벌칙을 수행하고
// 호스트가 그 사람 이름을 눌러야 그 사람 폰에만 질문이 열린다.
import { useState } from 'react'
import { useValue, dbSet, dbRemove, dbTransaction, SERVER_TS } from '../lib/db'
import { Button } from '../components/ui'

const SLOTS = [
  { key: 'jin', label: '진', medal: '🥇', color: 'var(--c-coral)' },
  { key: 'seon', label: '선', medal: '🥈', color: 'var(--c-grape)' },
  { key: 'mi', label: '미', medal: '🥉', color: 'var(--c-sky)' },
]

// 질문 주사위 — 질문자가 카테고리를 골라 굴린다. 진선미는 top3(진🥇선🥈미🥉)를 뽑으므로 "제일 ~한 사람?" 형태.
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)]
// 💘 설렘 — 호감·매력·연애
const Q_SWEET = [
  '여기서 제일 잘생긴/예쁜 사람은?',
  '사귀고 싶은 사람은?',
  '첫인상 제일 좋았던 사람은?',
  '무인도에 딱 한 명 데려간다면?',
  '목소리에 반할 것 같은 사람은?',
  '이상형에 제일 가까운 사람은?',
  '웃는 게 제일 매력적인 사람은?',
  '술친구로 최고인 사람은?',
  '소개팅 주선받고 싶은 사람은?',
  '스타일·패션 제일 좋은 사람은?',
  '같이 여행 가고 싶은 사람은?',
  '고민 상담하고 싶은 사람은?',
  '남자/여자로서 제일 멋진 사람은?',
  '연락처 제일 받고 싶은 사람은?',
  '다시 태어나도 친구 하고 싶은 사람은?',
  '몰래 잘 챙겨주는 사람은?',
  '분위기 메이커는?',
  '눈웃음이 제일 예쁜 사람은?',
]
// 😈 놀림 — 로스트
const Q_ROAST = [
  '제일 먼저 취해서 뻗을 것 같은 사람은?',
  '술 취하면 제일 진상 될 것 같은 사람은?',
  '흑역사 제일 많을 것 같은 사람은?',
  '검색기록 절대 못 보여줄 것 같은 사람은?',
  '자취방 제일 더러울 것 같은 사람은?',
  '전 애인한테 아직 미련 남았을 것 같은 사람은?',
  '몰래 성형했을 것 같은 사람은?',
  '카톡 읽씹 제일 잘할 것 같은 사람은?',
  '방귀 뀌고 시치미 뗄 것 같은 사람은?',
  '술값 계산 때 슬쩍 화장실 갈 것 같은 사람은?',
  '자면서 침 흘릴 것 같은 사람은?',
  '취하면 갑자기 울 것 같은 사람은?',
  '여기서 제일 허세 심한 사람은?',
  '연락 제일 안 되는 사람은?',
  '엄마한테 아직 용돈 받을 것 같은 사람은?',
  '다이어트 맨날 실패할 것 같은 사람은?',
]
// 🤯 반전 — 숨은 반전
const Q_TWIST = [
  '알고 보면 제일 밝힐 것 같은 사람은?',
  '순진해 보이는데 반전 있을 것 같은 사람은?',
  '조용한데 사고 제일 크게 칠 것 같은 사람은?',
  '착해 보이는데 뒤끝 있을 것 같은 사람은?',
  '첫인상과 실제가 제일 다른 사람은?',
  '술 마시면 완전 딴사람 될 것 같은 사람은?',
  '알고 보면 금수저일 것 같은 사람은?',
  '의외로 연애 고수일 것 같은 사람은?',
  '겉은 센데 알고 보면 여린 사람은?',
  '의외로 인기 많을 것 같은 사람은?',
  '놀 것 같은데 의외로 모범생일 사람은?',
  '조용한데 알고 보면 인싸일 사람은?',
]
// 🔞 19금 — 연애·스킨십·야함 (19금 토글 ON일 때만)
const Q_ADULT = [
  '하룻밤 같이 보내고 싶은 사람은?',
  '키스하고 싶은 사람은?',
  '여기서 제일 섹시한 사람은?',
  '몸매 제일 좋을 것 같은 사람은?',
  '침대에서 잘할 것 같은 사람은?',
  '술 취하면 넘어올 것 같은 사람은?',
  '은근 밝힐 것 같은 사람은?',
  '스킨십 진도 제일 빠를 사람은?',
  '오늘 밤 썸 타고 싶은 사람은?',
  '모텔 가자면 갈 것 같은 사람은?',
  '목소리가 제일 야한 사람은?',
  '비밀 연애하고 싶은 사람은?',
  '남몰래 눈길 가는 사람은?',
  '반전 몸매일 것 같은 사람은?',
  '원나잇 상대로 최고일 사람은?',
  '애프터 신청하고 싶은 사람은?',
  '취향 저격인 사람은?',
  '전 애인 삼고 싶은 사람은?',
]

// ───────────────────────── 호스트 화면 ─────────────────────────
function HostView({ base, players }) {
  const q = useValue(`${base}/q`)
  const asker = useValue(`${base}/asker`)
  const pick = useValue(`${base}/pick`)
  const reveals = useValue(`${base}/reveals`)
  const wants = useValue(`${base}/wants`)
  const nameOf = (id) => players.find((p) => p.id === id)?.nickname || '—'

  // 아직 질문 전 → 호스트가 질문자를 지정
  if (!q) {
    return (
      <div className="text-center">
        {asker ? (
          <div className="py-6">
            <div style={{ color: 'var(--ink-soft)' }}>질문자 지정됨 · 익명 질문 작성 중…</div>
            <div className="font-display text-4xl mt-1 animate-pop">✍️ {asker.nick}</div>
            <button
              onClick={() => dbRemove(`${base}/asker`)}
              className="clay-btn mt-4 px-4 py-2 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}
            >
              ↩ 질문자 다시 고르기
            </button>
          </div>
        ) : (
          <>
            <p className="font-display text-xl mb-3">💌 누가 익명 질문을 보낼까요?</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dbSet(`${base}/asker`, { id: p.id, nick: p.nickname })}
                  className="clay-btn px-3 py-1.5 font-bold"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  {p.nickname}
                </button>
              ))}
              {players.length === 0 && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  // 질문자·지목대상은 이미 질문을 알고 있으니 열람 대상에서 제외
  const audience = players.filter((p) => p.id !== q.askerId && p.id !== q.targetId)

  return (
    <div className="text-center">
      <div style={{ color: 'var(--ink-soft)' }}>익명의 질문을 받은 사람</div>
      <div className="font-display text-4xl mt-1 animate-pop">🎯 {q.targetNick}</div>
      <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>❓ 질문은 비공개 · 궁금하면 벌칙!</div>

      <div className="mt-5 grid grid-cols-3 gap-3 max-w-lg mx-auto">
        {SLOTS.map((s) => (
          <div key={s.key} className="clay-inset py-4">
            <div className="text-3xl">{s.medal}</div>
            <div className="font-display text-lg" style={{ color: s.color }}>{s.label}</div>
            <div className="font-display text-2xl mt-1">{pick?.[s.key] ? nameOf(pick[s.key]) : '…'}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-lg mx-auto text-left">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-soft)' }}>
          🍺 벌칙 수행 확인 후 이름을 누르면 그 사람 폰에 질문이 열립니다
        </div>
        {audience.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>열람 가능한 관객이 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {audience.map((p) => {
              const on = !!reveals?.[p.id]
              const want = !!wants?.[p.id]
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    on
                      ? dbRemove(`${base}/reveals/${p.id}`)
                      : (dbSet(`${base}/reveals/${p.id}`, true), dbRemove(`${base}/wants/${p.id}`))
                  }
                  className="clay-btn px-3 py-1.5 text-sm font-bold"
                  style={{
                    background: on ? 'var(--c-mint)' : want ? 'var(--c-coral)' : 'var(--surface-2)',
                    color: on || want ? '#fff' : 'var(--ink)',
                  }}
                >
                  {on ? '✅ ' : want ? '🍺 ' : ''}{p.nickname}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── 질문 작성 (질문자) ─────────────────────────
function Compose({ base, players, me, meta }) {
  const [target, setTarget] = useState(null)
  const [text, setText] = useState('')
  const candidates = players.filter((p) => p.id !== me.id)
  const roll = (arr) => setText(pickOne(arr))

  const send = () => {
    if (!target) return alert('질문할 상대를 고르세요.')
    if (!text.trim()) return alert('질문을 입력하세요.')
    const t = candidates.find((p) => p.id === target)
    if (!t) return
    dbTransaction(`${base}/q`, (cur) =>
      cur
        ? undefined // 이미 다른 사람이 먼저 질문함 → 취소
        : { askerId: me.id, askerNick: me.nickname, targetId: t.id, targetNick: t.nickname, text: text.trim(), ts: SERVER_TS }
    )
  }

  return (
    <div>
      <p className="text-center mb-3 font-display text-lg">💌 누구에게 익명 질문을 보낼까요?</p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => setTarget(p.id)}
            className="clay-btn py-3 font-display text-lg"
            style={target === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {p.nickname}
          </button>
        ))}
        {candidates.length === 0 && <p className="col-span-2 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>다른 참가자가 없어요.</p>}
      </div>
      <div className="mt-3">
        <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>🎲 질문 뽑기 — 카테고리 골라 굴리기 (수정 가능)</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={() => roll(Q_SWEET)} className="clay-btn px-3 py-1.5 text-sm font-display" style={{ background: 'var(--c-grape)', color: '#fff' }}>💘 설렘</button>
          <button onClick={() => roll(Q_ROAST)} className="clay-btn px-3 py-1.5 text-sm font-display" style={{ background: 'var(--c-coral)', color: '#fff' }}>😈 놀림</button>
          <button onClick={() => roll(Q_TWIST)} className="clay-btn px-3 py-1.5 text-sm font-display" style={{ background: 'var(--c-sky)', color: '#fff' }}>🤯 반전</button>
          {meta?.adultEnabled && <button onClick={() => roll(Q_ADULT)} className="clay-btn px-3 py-1.5 text-sm font-display" style={{ background: '#e64545', color: '#fff' }} title="19금 🔞">🔞 19</button>}
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="익명 질문 (예: 여기서 제일 좋아하는 사람 진선미는?)"
        rows={3}
        className="clay-inset w-full px-4 py-3 mt-2 resize-none"
      />
      <Button className="w-full mt-3" onClick={send}>🤫 익명으로 보내기</Button>
      <p className="mt-2 text-center text-xs" style={{ color: 'var(--ink-soft)' }}>질문자는 끝까지 비밀이에요.</p>
    </div>
  )
}

// ───────────────────────── 진선미 심사 (지목당한 사람) ─────────────────────────
function Judge({ base, q, players, me }) {
  const pick = useValue(`${base}/pick`)
  const candidates = players.filter((p) => p.id !== me.id)
  const needed = Math.min(3, candidates.length)
  const filled = SLOTS.filter((s) => pick?.[s.key]).length

  const slotOf = (id) => SLOTS.find((s) => pick?.[s.key] === id)
  const tap = (id) => {
    const s = slotOf(id)
    if (s) return dbRemove(`${base}/pick/${s.key}`) // 이미 선택됨 → 해제
    const empty = SLOTS.find((x) => !pick?.[x.key])
    if (empty) dbSet(`${base}/pick/${empty.key}`, id)
  }

  return (
    <div>
      <div className="clay-inset p-4 mb-4 text-center">
        <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>익명의 질문 🤫</div>
        <div className="font-display text-lg mt-1">{q.text}</div>
      </div>
      <p className="text-center mb-2" style={{ color: 'var(--ink-soft)' }}>
        전체 중에서 <b style={{ color: 'var(--c-coral)' }}>진</b>·<b style={{ color: 'var(--c-grape)' }}>선</b>·<b style={{ color: 'var(--c-sky)' }}>미</b>를 뽑아주세요 ({filled}/{needed})
      </p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((p) => {
          const s = slotOf(p.id)
          return (
            <button
              key={p.id}
              onClick={() => tap(p.id)}
              className="clay-btn py-3 font-display text-lg flex items-center justify-center gap-1.5"
              style={s ? { background: s.color, color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              {s && <span>{s.medal}</span>}{p.nickname}
            </button>
          )
        })}
      </div>
      {filled >= needed ? (
        <p className="mt-3 text-center font-display" style={{ color: 'var(--c-mint)' }}>선정 완료! 메인 화면 확인 ✨ (다시 눌러 변경 가능)</p>
      ) : (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>이름을 누르면 진→선→미 순서로 채워져요. 다시 누르면 해제.</p>
      )}
    </div>
  )
}

// ───────────────────────── 관객 (질문 열람 대기) ─────────────────────────
function Audience({ base, q, me }) {
  const reveals = useValue(`${base}/reveals`)
  const wants = useValue(`${base}/wants`)
  const revealed = !!reveals?.[me.id]
  const wanted = !!wants?.[me.id]

  if (revealed) {
    return (
      <div className="clay p-6 text-center" style={{ background: 'var(--c-grape)', color: '#fff' }}>
        <div className="opacity-80 text-sm">🔓 열린 질문 (벌칙 완료!)</div>
        <div className="font-display text-2xl mt-2">{q.text}</div>
        <div className="mt-2 text-xs opacity-80">→ {q.targetNick} 에게 물은 익명 질문</div>
      </div>
    )
  }
  return (
    <div className="text-center">
      <div className="text-5xl">🙈</div>
      <p className="mt-3 font-display text-xl">질문은 비공개!</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{q.targetNick} 의 진선미는 메인 화면에서 확인하세요.</p>
      {wanted ? (
        <p className="mt-4 font-display" style={{ color: 'var(--c-coral)' }}>🍺 벌칙 수행 후 호스트가 열어줄 거예요…</p>
      ) : (
        <Button variant="warn" className="w-full mt-4 py-4" onClick={() => dbSet(`${base}/wants/${me.id}`, true)}>
          🍺 벌칙하고 질문 볼래요
        </Button>
      )}
    </div>
  )
}

// ───────────────────────── 플레이어 화면 라우터 ─────────────────────────
function PlayerView({ base, meta, players, me }) {
  const q = useValue(`${base}/q`)
  const asker = useValue(`${base}/asker`)

  // 아직 질문 전 → 호스트가 고른 질문자만 작성, 나머지는 대기
  if (!q) {
    if (!asker) {
      return (
        <div className="text-center py-10">
          <div className="text-5xl">🤫</div>
          <p className="mt-3 font-display text-xl">호스트가 질문자를 고르는 중…</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
        </div>
      )
    }
    if (asker.id === me.id) return <Compose base={base} players={players} me={me} meta={meta} />
    return (
      <div className="text-center py-10">
        <div className="text-5xl">✍️</div>
        <p className="mt-3 font-display text-xl">{asker.nick} 님이 익명 질문을 준비 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>잠시만 기다려 주세요!</p>
      </div>
    )
  }

  if (me.id === q.targetId) return <Judge base={base} q={q} players={players} me={me} />
  if (me.id === q.askerId) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl">익명 질문 전송 완료!</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>당신이 질문자란 건 비밀 · {q.targetNick} 의 진선미를 기다려요.</p>
      </div>
    )
  }
  return <Audience base={base} q={q} me={me} />
}

export default {
  id: 'jinseonmi',
  name: '진선미',
  emoji: '👑',
  tagline: '익명 질문 · 진선미 심사 · 질문은 벌칙으로!',
  genres: ['party'],
  traits: ['anon', 'solo'],
  controls: { prompt: false, reveal: false, mode: 'reset', resetLabel: '🔄 새 질문' },
  HostView,
  PlayerView,
}
