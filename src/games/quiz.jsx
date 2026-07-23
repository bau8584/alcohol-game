// 상식퀴즈 — 객관식 4지선다. 전원 동시 선택 → 공개 → 틀린 사람 벌칙 🍺.
// 문항은 상식+넌센스+술상식 섞임. 정답 위치는 뽑을 때마다 셔플(항상 A가 정답인 문제 방지).
import { useMemo } from 'react'
import { useValue, dbSet, toList } from '../lib/db'

// Q(질문, 정답, 오답1, 오답2, 오답3)
const Q = (q, a, ...x) => ({ q, a, x })

// ── 상식 (틀려도 안전한 잘 알려진 사실 위주) ──
const COMMON = [
  Q('세계에서 가장 큰 대륙은?', '아시아', '아프리카', '유럽', '북아메리카'),
  Q('태양계에서 가장 큰 행성은?', '목성', '토성', '지구', '화성'),
  Q('사람 몸에서 가장 큰 장기는?', '피부', '간', '심장', '폐'),
  Q('무지개는 몇 가지 색?', '7가지', '5가지', '6가지', '8가지'),
  Q('빛의 삼원색이 모두 합쳐지면?', '흰색', '검은색', '회색', '노란색'),
  Q('대한민국의 국화(나라꽃)는?', '무궁화', '진달래', '개나리', '벚꽃'),
  Q('물이 어는 온도는?', '0도', '10도', '-10도', '5도'),
  Q('축구 한 팀은 몇 명?', '11명', '10명', '9명', '12명'),
  Q('세계에서 가장 높은 산은?', '에베레스트', '한라산', '후지산', '킬리만자로'),
  Q('피자의 원조 나라는?', '이탈리아', '미국', '프랑스', '그리스'),
  Q('꿀을 만드는 곤충은?', '벌', '개미', '나비', '파리'),
  Q('한글을 만든 왕은?', '세종대왕', '태종', '광개토대왕', '이순신'),
]

// ── 넌센스 (정답 = 말장난 펀치라인) ──
const NONSENSE = [
  Q('세종대왕이 만든 우유는?', '아야어여', '서울우유', '아침우유', '초코우유'),
  Q('물고기의 반대말은?', '불고기', '뭍고기', '새고기', '회'),
  Q('오리를 생으로 먹으면?', '회오리', '오리회', '생오리', '꽥회'),
  Q('별 중에 가장 슬픈 별은?', '이별', '샛별', '북극성', '견우'),
  Q('바나나가 웃으면?', '바나나킥', '바나나맛', '껍질', '반달'),
  Q('세상에서 제일 큰 콩은?', '킹콩', '강낭콩', '완두콩', '메주콩'),
  Q('세상에서 가장 빠른 닭은?', '후다닥', '통닭', '치킨', '삼계탕'),
  Q('소가 웃는 소리는?', '우하하', '음메하', '소호호', '모모'),
  Q('개가 사람을 가르치면?', '개인지도', '개교육', '멍교수', '도그샘'),
  Q('젤리가 죽으면?', '겔포스', '젤라', '푸딩', '곰돌이'),
]

// ── 술상식·술자리 ──
const DRINK = [
  Q('소주 한 병은 대략 몇 잔?', '7잔', '5잔', '10잔', '3잔'),
  Q('맥주의 주 원료는?', '보리(맥아)', '쌀', '포도', '사과'),
  Q('막걸리의 주재료는?', '쌀', '보리', '포도', '옥수수'),
  Q('와인은 무엇으로 만드나?', '포도', '사과', '보리', '쌀'),
  Q("'소맥'의 '맥'은?", '맥주', '맥심', '맥반석', '보리차'),
  Q('데킬라와 함께 먹는 것은?', '소금과 레몬', '설탕', '고추', '꿀'),
  Q('숙취에 좋다고 흔히 말하는 것은?', '꿀물', '사이다', '에스프레소', '소금물'),
  Q('폭탄주 기본 조합은?', '소주+맥주', '와인+콜라', '위스키+우유', '막걸리+사이다'),
]

const ALL = [...COMMON, ...NONSENSE, ...DRINK]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const LETTERS = ['A', 'B', 'C', 'D']
const COLORS = ['var(--c-sky)', 'var(--c-pink)', 'var(--c-grape)', 'var(--c-mint)']

// 문제 뽑기 → 보기 셔플 + 정답 index 계산
function rollQuiz() {
  const item = ALL[Math.floor(Math.random() * ALL.length)]
  const opts = shuffle([item.a, ...item.x])
  return { q: item.q, opts, ans: opts.indexOf(item.a) }
}

function HostView({ base, meta, players }) {
  const quiz = useValue(`${base}/quiz`)
  const picks = useValue(`${base}/pick`)
  const reveal = meta.roundStatus === 'reveal'

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const { counts, answered, correctNames, wrongNames } = useMemo(() => {
    const counts = [0, 0, 0, 0]
    const correctNames = [], wrongNames = []
    toList(picks).forEach((e) => {
      const i = e.value
      if (typeof i !== 'number' || i < 0 || i > 3) return
      counts[i]++
      const nm = byId[e.id]?.nickname || e.id
      if (quiz && i === quiz.ans) correctNames.push(nm); else wrongNames.push(nm)
    })
    return { counts, answered: correctNames.length + wrongNames.length, correctNames, wrongNames }
  }, [picks, byId, quiz])

  return (
    <div className="text-center">
      {!reveal && (
        <button onClick={() => dbSet(base, { quiz: rollQuiz(), pick: null })} className="clay-btn px-6 py-2 text-lg font-display mb-3" style={{ background: 'var(--c-grape)', color: '#fff' }}>
          🎲 문제 뽑기
        </button>
      )}

      <div className="font-display text-2xl">{quiz?.q || '🎲 문제 뽑기를 누르세요'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{answered}/{players.length} 응답{!reveal && quiz ? ' · 공개 전' : ''}</div>

      {quiz && (
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {quiz.opts.map((opt, i) => {
            const isAns = reveal && i === quiz.ans
            return (
              <div key={i} className="clay flex items-center justify-between px-4 py-3" style={{ background: isAns ? 'var(--c-mint)' : 'var(--surface)', color: isAns ? '#fff' : 'var(--ink)' }}>
                <div>
                  <span className="font-display" style={{ color: isAns ? '#fff' : COLORS[i] }}>{LETTERS[i]}.</span>{' '}
                  <span className="font-display text-lg">{opt}</span>
                  {isAns && <span className="ml-2">✅ 정답</span>}
                </div>
                {reveal && <span className="font-display text-2xl">{counts[i]}</span>}
              </div>
            )
          })}
        </div>
      )}

      {reveal && quiz && (
        <div className="mt-5 grid gap-3 max-w-2xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="clay p-3" style={{ background: 'var(--c-mint)', color: '#fff' }}>
            <div className="font-display text-lg">✅ 정답 · {correctNames.length}명</div>
            <div className="text-sm mt-1 opacity-90">{correctNames.join(', ') || '아무도 못 맞혔어요'}</div>
          </div>
          <div className="clay p-3" style={{ background: 'var(--c-coral)', color: '#fff' }}>
            <div className="font-display text-lg">🍺 벌칙 · {wrongNames.length}명</div>
            <div className="text-sm mt-1 opacity-90">{wrongNames.join(', ') || '전원 정답!'}</div>
          </div>
        </div>
      )}
      {!reveal && quiz && <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>▶ 시작 → 참가자 선택 → 👁 공개</p>}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const quiz = useValue(`${base}/quiz`)
  const mine = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'

  if (!quiz) return <div className="text-center py-12"><div className="text-5xl">🧠</div><p className="mt-3 font-display text-xl">진행자가 문제를 뽑는 중…</p></div>

  return (
    <div className="text-center">
      <p className="font-display text-xl">{quiz.q}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>정답을 골라요! 틀리면 벌칙 🍺</p>
      <div className="grid grid-cols-1 gap-2 mt-4">
        {quiz.opts.map((opt, i) => {
          const picked = mine === i
          const isAns = reveal && i === quiz.ans
          const wrongPick = reveal && picked && i !== quiz.ans
          const bg = isAns ? 'var(--c-mint)' : wrongPick ? 'var(--c-coral)' : picked ? COLORS[i] : 'var(--surface-2)'
          return (
            <button
              key={i}
              onClick={() => open && dbSet(`${base}/pick/${me.id}`, i)}
              disabled={!open}
              className="clay-btn py-4 font-display text-lg flex items-center gap-3 px-4"
              style={{ background: bg, color: isAns || wrongPick || picked ? '#fff' : 'var(--ink)' }}
            >
              <span className="w-6 shrink-0">{LETTERS[i]}</span>
              <span className="flex-1 text-left">{opt}</span>
              {isAns && <span>✅</span>}
              {wrongPick && <span>🍺</span>}
            </button>
          )
        })}
      </div>
      {reveal ? (
        <p className="mt-3 font-display" style={{ color: mine === quiz.ans ? 'var(--c-mint)' : 'var(--c-coral)' }}>
          {mine == null ? '미응답 😴' : mine === quiz.ans ? '🎉 정답!' : '🍺 틀렸어요 · 한 잔!'}
        </p>
      ) : open && mine != null ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>선택 완료 · 변경 가능</p>
      ) : !open ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>
      ) : null}
    </div>
  )
}

export default {
  id: 'quiz',
  name: '상식퀴즈',
  emoji: '🧠',
  tagline: '4지선다 · 틀리면 벌칙 · 상식/넌센스/술상식',
  genres: ['brain'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
