// 싱크로 (4지선다 텔레파시) — 제시어 + 보기 4개. 정답은 없고, 팀원과 '같은 보기'를 고르면 싱크로💞.
// 호스트가 제시어/보기를 🎲 프리셋 또는 직접 입력으로 정하고, 참가자는 4개 중 하나를 고른다.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, toList } from '../lib/db'
import { Button } from '../components/ui'

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

function HostView({ base, meta, players, teams }) {
  const quiz = useValue(`${base}/quiz`)
  const picks = useValue(`${base}/pick`)
  const modeRaw = useValue(`${base}/mode`)
  const mode = modeRaw === 'team' ? 'team' : 'solo'
  const reveal = meta.roundStatus === 'reveal'

  // 로컬 편집 초안 (호스트가 유일한 작성자 → 충돌 없음)
  const [draft, setDraft] = useState({ q: '', opts: ['', '', '', ''] })
  useEffect(() => { setDraft(quiz || { q: '', opts: ['', '', '', ''] }) }, [meta.roundSeq]) // eslint-disable-line

  const write = (next) => { setDraft(next); dbSet(`${base}/quiz`, next); dbSet(`${base}/pick`, null) }
  const roll = (arr) => write(arr[Math.floor(Math.random() * arr.length)])
  const setQ = (v) => { const n = { ...draft, q: v }; setDraft(n); dbSet(`${base}/quiz`, n) }
  const setOpt = (i, v) => { const opts = [...draft.opts]; opts[i] = v; const n = { ...draft, opts }; setDraft(n); dbSet(`${base}/quiz`, n) }

  // 보기별 집계 (개인전)
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const groups = useMemo(() => {
    const g = [[], [], [], []]
    toList(picks).forEach((e) => {
      const i = e.value
      if (i >= 0 && i < 4) g[i].push(byId[e.id]?.nickname || e.id)
    })
    return g
  }, [picks, byId])
  const submitted = groups.reduce((a, b) => a + b.length, 0)
  const maxCount = Math.max(0, ...groups.map((g) => g.length))

  // 팀별 싱크로율 (팀전) — 팀원 중 같은 보기를 고른 최대 인원 / 응답 인원
  const teamStats = useMemo(() => {
    const pk = picks || {}
    return (teams || []).map((t) => {
      const memberPicks = (t.members || []).map((m) => pk[m.id]).filter((i) => typeof i === 'number' && i >= 0 && i < 4)
      const counts = [0, 0, 0, 0]
      memberPicks.forEach((i) => counts[i]++)
      const answered = memberPicks.length
      const biggest = Math.max(0, ...counts)
      const bestOpt = counts.indexOf(biggest)
      return { t, answered, total: (t.members || []).length, biggest, bestOpt, rate: answered ? biggest / answered : 0 }
    }).sort((a, b) => b.rate - a.rate || b.biggest - a.biggest || b.answered - a.answered)
  }, [teams, picks])

  const setMode = (m) => dbSet(`${base}/mode`, m)

  return (
    <div className="text-center">
      {!reveal && (
        <div className="mb-3 max-w-md mx-auto">
          <input value={draft.q} onChange={(e) => setQ(e.target.value)} placeholder="제시어 (직접 입력 또는 🎲)" className="clay-inset w-full px-3 py-2.5 text-center font-display" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="font-display w-5 shrink-0" style={{ color: COLORS[i] }}>{LETTERS[i]}</span>
                <input value={draft.opts?.[i] || ''} onChange={(e) => setOpt(i, e.target.value)} placeholder={`보기 ${i + 1}`} className="clay-inset flex-1 min-w-0 px-2 py-2 text-center text-sm" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={() => roll(NORMAL)} className="clay-btn px-6 py-2 text-2xl" style={{ background: 'var(--c-grape)', color: '#fff' }} title="랜덤 제시어">🎲</button>
            <button onClick={() => roll(ADULT)} className="clay-btn px-6 py-2 text-2xl" style={{ background: '#e64545', color: '#fff' }} title="19금 랜덤 🔞">🎲 19</button>
          </div>
        </div>
      )}

      {/* 모드 토글: 개인전 ↔ 팀전 (공개 중에도 전환 가능) */}
      <div className="flex justify-center gap-2 mb-3">
        {[['solo', '🧍 개인전'], ['team', '👥 팀전']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} className="clay-btn px-4 py-1.5 text-sm font-bold" style={mode === m ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="font-display text-2xl">{quiz?.q || '제시어를 정하세요'}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{submitted}/{players.length} 선택{!reveal && ' · 공개 전'}</div>

      {reveal && mode === 'team' ? (
        // 팀별 싱크로율 순위
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {teamStats.map((s, r) => {
            const champ = r === 0 && s.answered > 0
            return (
              <div key={s.t.id} className="clay flex items-center justify-between px-4 py-3" style={{ background: champ ? s.t.color : 'var(--surface)', color: champ ? '#fff' : 'var(--ink)' }}>
                <div className="min-w-0 flex items-center gap-2">
                  <span className="font-display text-xl w-6 shrink-0">{champ ? '🏆' : r + 1}</span>
                  <span className="font-display text-lg" style={{ color: champ ? '#fff' : s.t.color }}>{s.t.name}</span>
                  {s.answered > 0
                    ? <span className="text-sm opacity-80"> · {s.biggest}/{s.answered} 일치 · {LETTERS[s.bestOpt]}. {quiz?.opts?.[s.bestOpt] || '—'}</span>
                    : <span className="text-sm opacity-70"> · 미참여</span>}
                </div>
                <span className="font-display text-2xl shrink-0 ml-2">{s.answered ? Math.round(s.rate * 100) : 0}%{champ && s.rate === 1 ? '💯' : ''}</span>
              </div>
            )
          })}
          {!teamStats.length && <p className="py-6 text-center" style={{ color: 'var(--ink-soft)' }}>팀이 없어요.</p>}
        </div>
      ) : (
        // 보기별 분포 (개인전 · 공개 전 보기 미리보기 겸용)
        <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
          {[0, 1, 2, 3].map((i) => {
            const isTop = reveal && groups[i].length > 0 && groups[i].length === maxCount
            return (
              <div key={i} className="clay flex items-center justify-between px-4 py-3" style={{ background: isTop ? COLORS[i] : 'var(--surface)', color: isTop ? '#fff' : 'var(--ink)' }}>
                <div className="min-w-0">
                  <span className="font-display" style={{ color: isTop ? '#fff' : COLORS[i] }}>{LETTERS[i]}.</span>{' '}
                  <span className="font-display text-lg">{quiz?.opts?.[i] || '—'}</span>
                  {reveal && groups[i].length > 0 && <span className="text-sm opacity-80"> · {groups[i].join(', ')}</span>}
                </div>
                {reveal && <span className="font-display text-2xl shrink-0 ml-2">{groups[i].length}{isTop && groups[i].length >= 2 ? '💞' : ''}</span>}
              </div>
            )
          })}
        </div>
      )}
      {!reveal && <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>▶ 시작 → 참가자 선택 → 👁 공개{mode === 'team' ? ' → 팀별 싱크로율 순위' : ''}</p>}
    </div>
  )
}

function PlayerView({ base, meta, me }) {
  const quiz = useValue(`${base}/quiz`)
  const mine = useValue(`${base}/pick/${me.id}`)
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'

  if (!quiz?.q) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">💞</div>
        <p className="mt-3 font-display text-xl">호스트가 문제를 준비 중…</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="font-display text-xl">{quiz.q}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>팀원과 같은 보기를 고르면 싱크로 💞</p>
      <div className="grid grid-cols-1 gap-2 mt-4">
        {[0, 1, 2, 3].map((i) => {
          const picked = mine === i
          return (
            <button
              key={i}
              onClick={() => open && dbSet(`${base}/pick/${me.id}`, i)}
              disabled={!open}
              className="clay-btn py-4 font-display text-lg flex items-center gap-3 px-4"
              style={picked ? { background: COLORS[i], color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              <span className="w-6 shrink-0" style={{ color: picked ? '#fff' : COLORS[i] }}>{LETTERS[i]}</span>
              <span className="flex-1 text-left">{quiz.opts?.[i] || '—'}</span>
              {picked && <span>✓</span>}
            </button>
          )
        })}
      </div>
      {!open && !reveal && <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>}
      {reveal && <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>🔒 공개됨 · 메인 화면 확인!</p>}
      {open && mine != null && <p className="mt-3 text-sm" style={{ color: 'var(--c-mint)' }}>선택 완료 · 변경 가능</p>}
    </div>
  )
}

export default {
  id: 'sync',
  name: '싱크로',
  emoji: '💞',
  tagline: '4지선다 텔레파시 · 개인전/팀전 순위',
  genres: ['telepathy'],
  traits: ['solo', 'team'],
  HostView,
  PlayerView,
}
