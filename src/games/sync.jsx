// 싱크로 (마음 맞히기) — 질문자가 4개 보기 중 '답 하나'를 비밀로 정하고, 나머지가 그 답을 맞힌다.
// 질문자와 같은 보기를 고른 사람 = 텔레파시 성공 💯, 못 맞힌 사람 = 벌칙 🍺.
// 호스트가 제시어/보기를 🎲 프리셋 또는 직접 입력으로 정하고, 질문자를 지목한다.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet } from '../lib/db'

const LETTERS = ['A', 'B', 'C', 'D']
const COLORS = ['var(--c-coral)', 'var(--c-sky)', 'var(--c-grape)', 'var(--c-mint)']

// 프리셋: { q: 제시어, opts: [보기 4개] }
const NORMAL = [
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
const ADULT = [
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

/* ───────── 호스트 ───────── */
function HostView({ base, meta, players }) {
  const quiz = useValue(`${base}/quiz`)
  const answerer = useValue(`${base}/answerer`) // 질문자 playerId
  const answer = useValue(`${base}/answer`) // 질문자의 비밀 답(0~3) — 공개 전엔 값 숨김
  const picks = useValue(`${base}/pick`)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const answererName = byId[answerer]?.nickname

  // 로컬 편집 초안 (호스트가 유일한 작성자 → 충돌 없음)
  const [draft, setDraft] = useState({ q: '', opts: ['', '', '', ''] })
  useEffect(() => { setDraft(quiz || { q: '', opts: ['', '', '', ''] }) }, [meta.roundSeq]) // eslint-disable-line

  const write = (next) => { setDraft(next); dbSet(`${base}/quiz`, next); dbSet(`${base}/pick`, null); dbSet(`${base}/answer`, null) }
  const roll = (arr) => write(arr[Math.floor(Math.random() * arr.length)])
  const setQ = (v) => { const n = { ...draft, q: v }; setDraft(n); dbSet(`${base}/quiz`, n) }
  const setOpt = (i, v) => { const opts = [...draft.opts]; opts[i] = v; const n = { ...draft, opts }; setDraft(n); dbSet(`${base}/quiz`, n) }

  // 추측 집계 (질문자 제외)
  const guessers = players.filter((p) => p.id !== answerer)
  const pk = picks || {}
  const answered = typeof answer === 'number'
  const byOption = useMemo(() => {
    const g = [[], [], [], []]
    guessers.forEach((p) => { const i = pk[p.id]; if (typeof i === 'number' && i >= 0 && i < 4) g[i].push(p.nickname) })
    return g
  }, [picks, answerer, players]) // eslint-disable-line
  const guessCount = guessers.filter((p) => typeof pk[p.id] === 'number').length
  const correctNames = answered ? byOption[answer] : []
  const wrongNames = guessers.filter((p) => typeof pk[p.id] === 'number' && pk[p.id] !== answer).map((p) => p.nickname)

  return (
    <div className="text-center">
      {staged ? (
        <>
          {/* 질문 편집 */}
          <div className="mb-3 max-w-md mx-auto text-left">
            <div className="flex gap-2 justify-center mb-2">
              <button onClick={() => roll(NORMAL)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲 일반</button>
              <button onClick={() => roll(ADULT)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>
            </div>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>✏️ 주사위로 뽑은 뒤, 제시어·보기를 원하는 대로 고쳐도 돼요</div>
            <input value={draft.q} onChange={(e) => setQ(e.target.value)} placeholder="제시어 입력" className="clay-inset w-full px-3 py-2.5 text-center font-display" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-display w-6 h-8 shrink-0 flex items-center justify-center rounded-lg text-sm" style={{ background: COLORS[i], color: '#fff' }}>{LETTERS[i]}</span>
                  <input value={draft.opts?.[i] || ''} onChange={(e) => setOpt(i, e.target.value)} placeholder={`보기 ${i + 1}`} className="clay-inset flex-1 min-w-0 px-2 py-2 text-center" />
                </div>
              ))}
            </div>
          </div>

          {/* 질문자 지목 */}
          <div className="max-w-md mx-auto">
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>🤫 답을 정할 <b>질문자</b>를 골라주세요</div>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dbSet(`${base}/answerer`, p.id)}
                  className="clay-btn px-3 py-1.5 font-bold"
                  style={answerer === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
                >
                  {answerer === p.id ? '🤫 ' : ''}{p.nickname}
                </button>
              ))}
              {!players.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>참가자가 없어요.</span>}
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {answerer ? '▶ 시작 → 질문자가 답을 정하고, 나머지가 맞혀요' : '질문자를 먼저 골라주세요'}
          </p>
        </>
      ) : (
        <>
          <div className="font-display text-2xl">{quiz?.q || '제시어'}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
            🤫 질문자 <b style={{ color: 'var(--ink)' }}>{answererName || '?'}</b>
            {!reveal && <> · 답 {answered ? '정함 ✓' : '고르는 중…'} · 추측 {guessCount}/{guessers.length}</>}
          </div>

          <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
            {[0, 1, 2, 3].map((i) => {
              const isAns = reveal && answer === i
              return (
                <div key={i} className="clay flex items-center justify-between px-4 py-3" style={{ background: isAns ? COLORS[i] : 'var(--surface)', color: isAns ? '#fff' : 'var(--ink)' }}>
                  <div className="min-w-0">
                    <span className="font-display" style={{ color: isAns ? '#fff' : COLORS[i] }}>{LETTERS[i]}.</span>{' '}
                    <span className="font-display text-lg">{quiz?.opts?.[i] || '—'}</span>
                    {reveal && byOption[i].length > 0 && <span className="text-sm opacity-80"> · {byOption[i].join(', ')}</span>}
                  </div>
                  <div className="shrink-0 ml-2 flex items-center gap-1">
                    {reveal && <span className="font-display text-2xl">{byOption[i].length}</span>}
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
                </>
              ) : (
                <p className="font-bold" style={{ color: 'var(--c-coral)' }}>질문자가 답을 안 정했어요. 🔄 새 라운드로 다시!</p>
              )}
            </div>
          )}
          {!reveal && <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>질문자가 답을 정하면 👁 공개!</p>}
        </>
      )}
    </div>
  )
}

/* ───────── 플레이어 ───────── */
function OptionButtons({ opts, selected, onPick, disabled }) {
  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      {[0, 1, 2, 3].map((i) => {
        const picked = selected === i
        return (
          <button
            key={i}
            onClick={() => !disabled && onPick(i)}
            disabled={disabled}
            className="clay-btn py-4 font-display text-lg flex items-center gap-3 px-4"
            style={picked ? { background: COLORS[i], color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
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
  const amAnswerer = answerer === me.id
  const answererName = players.find((p) => p.id === answerer)?.nickname || '질문자'

  if (!quiz?.q) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">💞</div>
        <p className="mt-3 font-display text-xl">호스트가 문제를 준비 중…</p>
      </div>
    )
  }

  // 공개
  if (reveal) {
    const ansText = typeof answer === 'number' ? `${LETTERS[answer]}. ${quiz.opts?.[answer] || '—'}` : '미정'
    if (amAnswerer) {
      return (
        <div className="text-center">
          <p className="font-display text-xl">{quiz.q}</p>
          <div className="mt-4 clay p-6" style={{ background: 'var(--c-grape)', color: '#fff' }}>
            <div className="opacity-80 text-sm">🤫 내가 고른 답</div>
            <div className="font-display text-3xl mt-1">{ansText}</div>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면에서 누가 맞혔는지 확인!</p>
        </div>
      )
    }
    const correct = typeof answer === 'number' && mine === answer
    return (
      <div className="text-center">
        <p className="font-display text-xl">{quiz.q}</p>
        <div className="mt-4 clay p-6" style={{ background: correct ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
          <div className="font-display text-4xl">{correct ? '💯 정답!' : '🍺 벌칙!'}</div>
          <div className="mt-2 opacity-90">{answererName}의 답: <b>{ansText}</b></div>
          <div className="mt-1 text-sm opacity-80">내 추측: {typeof mine === 'number' ? `${LETTERS[mine]}. ${quiz.opts?.[mine] || '—'}` : '안 함'}</div>
        </div>
      </div>
    )
  }

  // 진행 전(대기)
  if (!open) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl">🤫</div>
        <p className="mt-3 font-display text-xl">
          {amAnswerer ? '당신이 질문자로 지정됐어요!' : `질문자: ${answererName}`}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자가 시작하면 시작해요…</p>
      </div>
    )
  }

  // 진행 중 — 질문자: 비밀 답 정하기
  if (amAnswerer) {
    return (
      <div className="text-center">
        <p className="font-display text-xl">{quiz.q}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--c-grape)' }}>🤫 당신이 <b>질문자</b>! 답 하나를 정하세요 · 남들이 이걸 맞혀요</p>
        <OptionButtons opts={quiz.opts} selected={typeof answer === 'number' ? answer : null} onPick={(i) => dbSet(`${base}/answer`, i)} />
        {typeof answer === 'number' && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>답 정함 · 변경 가능 (비밀)</p>}
      </div>
    )
  }

  // 진행 중 — 추측자
  return (
    <div className="text-center">
      <p className="font-display text-xl">{quiz.q}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>🔮 <b>{answererName}</b>가 고른 답을 맞혀보세요!</p>
      <OptionButtons opts={quiz.opts} selected={typeof mine === 'number' ? mine : null} onPick={(i) => dbSet(`${base}/pick/${me.id}`, i)} />
      {typeof mine === 'number' && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>추측 완료 · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'sync',
  name: '싱크로',
  emoji: '💞',
  tagline: '질문자의 답 맞히기 · 텔레파시',
  genres: ['telepathy'],
  traits: ['solo'],
  HostView,
  PlayerView,
}
