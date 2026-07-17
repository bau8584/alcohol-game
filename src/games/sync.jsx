// 싱크로 (마음 맞히기) — 마스터가 보기 중 '답 하나'를 비밀로 정하고, 나머지가 그 답을 맞힌다.
// 마스터와 같은 걸 고르면 텔레파시 성공 💯, 못 맞히면 벌칙 🍺. 판정은 마스터의 답 하나로 끝 → 시비 없음.
// 기본은 2지선다(A vs B) — 주사위 한 번이면 입력 끝. 보기 4개는 필요할 때만 연다.
// (구 '밸런스 배틀' 흡수: 2지선다 소신투표는 판정 규칙이 사후에 정해져 목표를 가질 수 없었음 → 마스터 맞히기로 대체)
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet } from '../lib/db'

const LETTERS = ['A', 'B', 'C', 'D']
const COLORS = ['var(--c-sky)', 'var(--c-pink)', 'var(--c-grape)', 'var(--c-mint)']

// ── 2지선다 프리셋: [A, B] ──
const PAIRS = [
  ['부먹', '찍먹'], ['민초', '반민초'], ['평생 여름', '평생 겨울'],
  ['돈 많은 백수', '바쁜 부자'], ['매일 연락', '가끔 연락'], ['치킨', '피자'],
  ['산', '바다'], ['아침형', '저녁형'], ['과거로 가기', '미래 보기'],
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
const PAIRS_ADULT = [
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

// ── 4지선다 프리셋: { q: 제시어, opts: [4개] } ──
const QUADS = [
  { q: '겨울 하면?', opts: ['눈', '스키', '붕어빵', '군고구마'] },
  { q: '술자리 최고의 안주', opts: ['치킨', '삼겹살', '골뱅이무침', '마른안주'] },
  { q: '숙취에 최고의 해장', opts: ['해장국', '라면', '콩나물국', '이온음료'] },
  { q: '첫 데이트 장소', opts: ['영화관', '카페', '놀이공원', '맛집'] },
  { q: '여행 가고 싶은 곳', opts: ['일본', '유럽', '동남아', '제주도'] },
  { q: 'MT 하면 떠오르는 것', opts: ['술', '고기', '게임', '밤샘'] },
  { q: '비 오는 날 먹고 싶은 것', opts: ['파전', '라면', '치킨', '칼국수'] },
  { q: '최고의 라면', opts: ['신라면', '진라면', '너구리', '삼양라면'] },
  { q: '삼겹살엔 이 술', opts: ['소주', '맥주', '소맥', '막걸리'] },
  { q: '스트레스 풀 때', opts: ['잠', '운동', '먹기', '쇼핑'] },
  { q: '가장 좋아하는 계절', opts: ['봄', '여름', '가을', '겨울'] },
  { q: '치킨 시키면?', opts: ['교촌', 'BBQ', 'BHC', '굽네'] },
  { q: '겨울 데이트 코스', opts: ['스키장', '온천', '카페', '집콕'] },
  { q: '이상형의 직업', opts: ['의사', '선생님', '공무원', '사업가'] },
  { q: '무인도에 하나만', opts: ['라이터', '칼', '핸드폰', '이성친구'] },
  { q: '라면에 추가한다면', opts: ['계란', '치즈', '파', '떡'] },
  { q: '분식 최강', opts: ['떡볶이', '김밥', '순대', '튀김'] },
  { q: '아이스크림 고르면', opts: ['메로나', '월드콘', '스크류바', '수박바'] },
  { q: '치킨 부위', opts: ['닭다리', '날개', '가슴살', '닭목'] },
  { q: '피자 토핑', opts: ['페퍼로니', '불고기', '포테이토', '치즈'] },
  { q: '카페 가면', opts: ['아메리카노', '라떼', '에이드', '디저트'] },
  { q: '노래방 애창곡 장르', opts: ['발라드', '댄스', '힙합', '트로트'] },
  { q: '술 취하면 나는', opts: ['말 많아짐', '조용해짐', '잠', '눈물'] },
  { q: '주량은?', opts: ['반 병', '한 병', '두 병', '세 병+'] },
  { q: '이별 통보 방법', opts: ['만나서', '전화', '카톡', '잠수'] },
  { q: '데이트 비용', opts: ['더치페이', '남자가', '번갈아', '능력자가'] },
  { q: '연애 스타일', opts: ['츤데레', '다정', '무심', '집착'] },
  { q: '최애 찌개', opts: ['김치', '된장', '부대', '순두부'] },
  { q: '겨울 간식', opts: ['붕어빵', '호빵', '군고구마', '호떡'] },
  { q: '소개팅 첫인상', opts: ['얼굴', '말투', '옷', '키'] },
  { q: '술게임 하면', opts: ['바니바니', '369', '베스킨', '아파트'] },
  { q: '편의점 필수템', opts: ['삼각김밥', '컵라면', '핫바', '도시락'] },
  { q: '이상형 스타일', opts: ['청순', '섹시', '귀여움', '시크'] },
  { q: '해외여행 우선', opts: ['맛집', '쇼핑', '관광', '휴양'] },
]
const QUADS_ADULT = [
  { q: '키스하기 좋은 장소', opts: ['영화관', '차 안', '한강', '집'] },
  { q: '이성의 섹시한 부위', opts: ['눈', '입술', '손', '뒷모습'] },
  { q: '가장 설레는 스킨십', opts: ['손잡기', '백허그', '이마뽀', '어깨기대기'] },
  { q: '연인과 가고 싶은 곳', opts: ['모텔', '여행', '드라이브', '우리집'] },
  { q: '이성의 가장 야한 것', opts: ['눈빛', '목소리', '향수', '몸매'] },
  { q: '침대에서 듣고 싶은 말', opts: ['사랑해', '예뻐', '자자', '한 번 더'] },
  { q: '설레는 밀당 행동', opts: ['벽치기', '머리쓰담', '귓속말', '허리감기'] },
  { q: '가장 끌리는 매력', opts: ['목소리', '향기', '손', '분위기'] },
  { q: '첫날밤 장소', opts: ['호텔', '우리집', '펜션', '차'] },
  { q: '가장 야한 옷차림', opts: ['원피스', '수영복', '정장', '트레이닝'] },
  { q: '스킨십 진도 시작', opts: ['손잡기', '포옹', '키스', '그 이상'] },
  { q: '야한 상상 시간대', opts: ['새벽', '밤', '샤워 중', '출근길'] },
  { q: '섹시한 목소리 톤', opts: ['낮은', '허스키', '속삭임', '콧소리'] },
  { q: '이성의 은밀한 매력', opts: ['쇄골', '목선', '허리', '입술'] },
  { q: '연애 중 야한 순간', opts: ['샤워 후', '아침', '취했을 때', '여행지'] },
  { q: '설레는 새벽 문자', opts: ['보고싶어', '자?', '뭐해', '우리집 올래'] },
  { q: '받고 싶은 야한 선물', opts: ['속옷', '향수', '오일', '장난감'] },
  { q: '가장 흥분되는 상황', opts: ['밀당', '벽치기', '귓속말', '스킨십'] },
  { q: '연인의 침대 스타일', opts: ['적극적', '수줍음', '리드', '장난꾸러기'] },
  { q: '술 취하면 하고 싶은', opts: ['연락', '스킨십', '고백', '뽀뽀'] },
]

const pick1 = (arr) => arr[Math.floor(Math.random() * arr.length)]
const emptyQuiz = (n) => ({ q: '', opts: Array(n).fill('') })
// 제목: 제시어가 있으면 제시어, 없으면 'A vs B'
const titleOf = (quiz) => quiz?.q || (quiz?.opts || []).filter(Boolean).join(' vs ') || '제시어'

/* ───────── 호스트 ───────── */
function HostView({ base, meta, players, teams }) {
  const quiz = useValue(`${base}/quiz`)
  const answerer = useValue(`${base}/answerer`) // 마스터 playerId
  const answer = useValue(`${base}/answer`) // 마스터의 비밀 답(index) — 공개 전엔 값 숨김
  const picks = useValue(`${base}/pick`)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const answererName = byId[answerer]?.nickname

  // 로컬 편집 초안 (호스트가 유일한 작성자 → 충돌 없음)
  const [draft, setDraft] = useState(emptyQuiz(2))
  useEffect(() => { setDraft(quiz || emptyQuiz(2)) }, [meta.roundSeq]) // eslint-disable-line
  const n = draft.opts?.length === 4 ? 4 : 2

  // 문제가 바뀌면 이전 답/추측은 무효 → 함께 정리
  const write = (next) => { setDraft(next); dbSet(`${base}/quiz`, next); dbSet(`${base}/pick`, null); dbSet(`${base}/answer`, null) }
  const rollPair = (arr) => { const [a, b] = pick1(arr); write({ q: '', opts: [a, b] }) }
  const rollQuad = (arr) => write(pick1(arr))
  const setSize = (size) => {
    if (size === n) return
    const opts = size === 2 ? (draft.opts || []).slice(0, 2) : [...(draft.opts || []), '', '', '', ''].slice(0, 4)
    write({ ...draft, opts })
  }
  // 편집(타이핑)은 답/추측을 지우지 않음 — 오타 수정하다 마스터 답이 날아가면 곤란
  const setQ = (v) => { const x = { ...draft, q: v }; setDraft(x); dbSet(`${base}/quiz`, x) }
  const setOpt = (i, v) => { const opts = [...draft.opts]; opts[i] = v; const x = { ...draft, opts }; setDraft(x); dbSet(`${base}/quiz`, x) }

  const live = players.filter((p) => p.connected !== false)
  const randomMaster = () => { if (live.length) dbSet(`${base}/answerer`, pick1(live).id) }

  // 추측 집계 (마스터 제외)
  const guessers = players.filter((p) => p.id !== answerer)
  const pk = picks || {}
  const answered = typeof answer === 'number'
  const byOption = useMemo(() => {
    const g = Array.from({ length: n }, () => [])
    guessers.forEach((p) => { const i = pk[p.id]; if (typeof i === 'number' && i >= 0 && i < n) g[i].push(p.nickname) })
    return g
  }, [picks, answerer, players, n]) // eslint-disable-line
  const guessCount = guessers.filter((p) => typeof pk[p.id] === 'number').length
  const correctNames = answered ? byOption[answer] || [] : []
  const wrongNames = guessers.filter((p) => typeof pk[p.id] === 'number' && pk[p.id] !== answer).map((p) => p.nickname)

  // 팀별 적중률 (마스터 제외 · 추측한 사람 기준)
  const teamStats = useMemo(() => {
    if (!answered) return []
    return (teams || []).map((t) => {
      const ans = (t.members || []).filter((m) => m.id !== answerer && typeof pk[m.id] === 'number')
      const hit = ans.filter((m) => pk[m.id] === answer).length
      return { t, answered: ans.length, hit, rate: ans.length ? hit / ans.length : 0 }
    }).sort((a, b) => b.rate - a.rate || b.hit - a.hit)
  }, [teams, picks, answer, answerer, answered]) // eslint-disable-line

  return (
    <div className="text-center">
      {staged ? (
        <>
          <div className="mb-3 max-w-md mx-auto text-left">
            {/* 보기 개수 — 기본 2지선다 */}
            <div className="flex justify-center gap-2 mb-2">
              {[2, 4].map((s) => (
                <button key={s} onClick={() => setSize(s)} className="clay-btn px-4 py-1.5 text-sm font-display"
                  style={n === s ? { background: 'var(--c-mint)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                  {s}지선다
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-center mb-2">
              <button onClick={() => (n === 2 ? rollPair(PAIRS) : rollQuad(QUADS))} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤">🎲 일반</button>
              {meta.adultEnabled && (
                <button onClick={() => (n === 2 ? rollPair(PAIRS_ADULT) : rollQuad(QUADS_ADULT))} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>
              )}
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>✏️ 주사위로 뽑은 뒤 자유롭게 고쳐도 돼요 · 제시어는 비워두면 “A vs B”로 나와요</div>

            <input value={draft.q || ''} onChange={(e) => setQ(e.target.value)} placeholder={n === 2 ? '제시어 (선택 · 비워도 됨)' : '제시어 입력'} className="clay-inset w-full px-3 py-2.5 text-center font-display" />
            <div className={`grid gap-2 mt-2 ${n === 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {Array.from({ length: n }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-display w-6 h-8 shrink-0 flex items-center justify-center rounded-lg text-sm" style={{ background: COLORS[i], color: '#fff' }}>{LETTERS[i]}</span>
                  <input value={draft.opts?.[i] || ''} onChange={(e) => setOpt(i, e.target.value)} placeholder={`보기 ${i + 1}`} className="clay-inset flex-1 min-w-0 px-2 py-2 text-center" />
                </div>
              ))}
            </div>
          </div>

          {/* 마스터 — 기본은 랜덤, 필요하면 직접 지목 */}
          <div className="max-w-md mx-auto">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>🤫 답을 정할 <b>마스터</b></div>
            <button onClick={randomMaster} disabled={!live.length} className="clay-btn px-5 py-2 font-display mb-2 disabled:opacity-40" style={{ background: 'var(--c-grape)', color: '#fff' }}>
              🎲 랜덤으로 뽑기
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <button key={p.id} onClick={() => dbSet(`${base}/answerer`, p.id)} className="clay-btn px-3 py-1.5 font-bold"
                  style={answerer === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                  {answerer === p.id ? '🤫 ' : ''}{p.nickname}
                </button>
              ))}
              {!players.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {answerer ? '▶ 시작 → 마스터가 답을 정하고, 나머지가 맞혀요' : '마스터를 먼저 뽑아주세요'}
          </p>
        </>
      ) : (
        <>
          <div className="font-display text-2xl">{titleOf(quiz)}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
            🤫 마스터 <b style={{ color: 'var(--ink)' }}>{answererName || '?'}</b>
            {!reveal && <> · 답 {answered ? '정함 ✓' : '고르는 중…'} · 추측 {guessCount}/{guessers.length}</>}
          </div>

          <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
            {Array.from({ length: n }, (_, i) => {
              const isAns = reveal && answer === i
              return (
                <div key={i} className="clay flex items-center justify-between px-4 py-3" style={{ background: isAns ? COLORS[i] : 'var(--surface)', color: isAns ? '#fff' : 'var(--ink)' }}>
                  <div className="min-w-0">
                    <span className="font-display" style={{ color: isAns ? '#fff' : COLORS[i] }}>{LETTERS[i]}.</span>{' '}
                    <span className="font-display text-lg">{quiz?.opts?.[i] || '—'}</span>
                    {reveal && (byOption[i] || []).length > 0 && <span className="text-sm opacity-80"> · {byOption[i].join(', ')}</span>}
                  </div>
                  <div className="shrink-0 ml-2 flex items-center gap-1">
                    {reveal && <span className="font-display text-2xl">{(byOption[i] || []).length}</span>}
                    {isAns && <span className="text-2xl">⭐</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {reveal && (
            <div className="mt-4 max-w-md mx-auto">
              {answered ? (
                <>
                  <div className="font-display text-xl">⭐ {answererName}의 답: {LETTERS[answer]}. {quiz?.opts?.[answer] || '—'}</div>
                  <div className="mt-2 clay-inset px-4 py-3 text-left">
                    <div className="font-bold" style={{ color: 'var(--c-mint)' }}>💯 맞힘 ({correctNames.length}): {correctNames.length ? correctNames.join(', ') : '없음'}</div>
                    <div className="font-bold mt-1" style={{ color: 'var(--c-coral)' }}>🍺 벌칙 ({wrongNames.length}): {wrongNames.length ? wrongNames.join(', ') : '없음'}</div>
                  </div>

                  {teamStats.length > 0 && (
                    <div className="mt-4 text-left">
                      <div className="text-sm mb-1 text-center" style={{ color: 'var(--ink-soft)' }}>팀별 적중률 (마스터 제외)</div>
                      <div className="space-y-1.5">
                        {teamStats.map((s, i) => {
                          const champ = i === 0 && s.hit > 0
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
                </>
              ) : (
                <p className="font-bold" style={{ color: 'var(--c-coral)' }}>마스터가 답을 안 정했어요. 🔄 새 라운드로 다시!</p>
              )}
            </div>
          )}
          {!reveal && <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>마스터가 답을 정하면 👁 공개!</p>}
        </>
      )}
    </div>
  )
}

/* ───────── 플레이어 ───────── */
function OptionButtons({ opts, selected, onPick, disabled }) {
  const n = opts?.length === 4 ? 4 : 2
  // 2지선다는 큼직한 2열 카드, 4지선다는 1열 리스트
  return (
    <div className={`grid gap-2 mt-4 ${n === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: n }, (_, i) => {
        const picked = selected === i
        const style = picked ? { background: COLORS[i], color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }
        if (n === 2) {
          return (
            <button key={i} onClick={() => !disabled && onPick(i)} disabled={disabled}
              className="h-40 rounded-3xl font-display clay-btn flex flex-col items-center justify-center gap-1" style={style}>
              <span className="text-2xl opacity-70">{LETTERS[i]}</span>
              <span className="text-2xl px-2 text-center leading-tight">{opts?.[i] || '—'}</span>
              {picked && <span className="text-sm">✓</span>}
            </button>
          )
        }
        return (
          <button key={i} onClick={() => !disabled && onPick(i)} disabled={disabled}
            className="clay-btn py-4 font-display text-lg flex items-center gap-3 px-4" style={style}>
            <span className="w-6 shrink-0" style={{ color: picked ? '#fff' : COLORS[i] }}>{LETTERS[i]}</span>
            <span className="flex-1 text-left">{opts?.[i] || '—'}</span>
            {picked && <span>✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const quiz = useValue(`${base}/quiz`)
  const answerer = useValue(`${base}/answerer`)
  const answer = useValue(`${base}/answer`)
  const mine = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const amMaster = answerer === me.id
  const masterName = players.find((p) => p.id === answerer)?.nickname || '마스터'
  const ready = (quiz?.opts || []).filter(Boolean).length >= 2
  const label = (i) => (typeof i === 'number' ? `${LETTERS[i]}. ${quiz?.opts?.[i] || '—'}` : '미정')

  if (!ready) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">💞</div>
        <p className="mt-3 font-display text-xl">호스트가 문제를 준비 중…</p>
      </div>
    )
  }

  if (reveal) {
    if (amMaster) {
      return (
        <div className="text-center">
          <p className="font-display text-xl">{titleOf(quiz)}</p>
          <div className="mt-4 clay p-6" style={{ background: 'var(--c-grape)', color: '#fff' }}>
            <div className="opacity-80 text-sm">🤫 내가 고른 답</div>
            <div className="font-display text-3xl mt-1">{label(answer)}</div>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면에서 누가 맞혔는지 확인!</p>
        </div>
      )
    }
    const correct = typeof answer === 'number' && mine === answer
    return (
      <div className="text-center">
        <p className="font-display text-xl">{titleOf(quiz)}</p>
        <div className="mt-4 clay p-6" style={{ background: correct ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
          <div className="font-display text-4xl">{correct ? '💯 정답!' : '🍺 벌칙!'}</div>
          <div className="mt-2 opacity-90">{masterName}의 답: <b>{label(answer)}</b></div>
          <div className="mt-1 text-sm opacity-80">내 추측: {typeof mine === 'number' ? label(mine) : '안 함'}</div>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl">{amMaster ? '당신이 마스터로 뽑혔어요!' : `마스터: ${masterName}`}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 시작해요…</p>
      </div>
    )
  }

  if (amMaster) {
    return (
      <div className="text-center">
        <p className="font-display text-xl">{titleOf(quiz)}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--c-grape)' }}>🤫 당신이 <b>마스터</b>! 답 하나를 정하세요 · 남들이 이걸 맞혀요</p>
        <OptionButtons opts={quiz.opts} selected={typeof answer === 'number' ? answer : null} onPick={(i) => dbSet(`${base}/answer`, i)} />
        {typeof answer === 'number' && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>답 정함 · 변경 가능 (비밀)</p>}
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="font-display text-xl">{titleOf(quiz)}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>🔮 <b>{masterName}</b>가 고른 답을 맞혀보세요!</p>
      <OptionButtons opts={quiz.opts} selected={typeof mine === 'number' ? mine : null} onPick={(i) => dbSet(`${base}/pick/${me.id}`, i)} />
      {typeof mine === 'number' && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>추측 완료 · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'sync',
  name: '싱크로',
  emoji: '💞',
  tagline: '마스터의 선택 맞히기 · A vs B',
  genres: ['telepathy', 'mind'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
