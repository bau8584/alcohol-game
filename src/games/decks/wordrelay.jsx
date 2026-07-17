// 이어 말하기 — 호스트 화면에 '앞 2글자'(또는 속담 앞부분)를 띄우면, 참가자가 각자 폰으로 나머지를 입력.
// 채점은 자동: 제출을 정답과 문자열 비교해서 서버 ts 기준 첫 정답자의 팀에 +1을 준다(호스트는 안 눌러도 됨).
// 오답이면 참가자가 다시 낼 수 있고, 1등이 나오면 정답이 자동 공개된다.
// 단어형 세트: text=앞 2글자(보임) / answer=나머지(정답). 속담형: text=앞부분 / answer=뒷부분.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction, toList, SERVER_TS } from '../../lib/db'
import { addTeamScore } from '../../lib/actions'
import { Button } from '../../components/ui'

// 앞 2글자만 제시(text), 나머지는 팀이 이어 말할 몫(answer·숨김)
const relay = (word) => ({ text: word.slice(0, 2), answer: word.slice(2) })

// ── 일상단어 ──
const daily = [
  '선글라스', '푸드코트', '쟁반짜장', '스핑크스', '숯불구이', '차돌박이', '해리포터', '청양고추', '만리장성', '스포일러',
  '장원급제', '미세먼지', '카테고리', '허리케인', '원두커피', '이모티콘', '카페라테', '술래잡기', '현상수배', '삼각팬티',
  '재롱잔치', '호루라기', '곱창구이', '승부차기', '헬리콥터', '치어리더', '계좌이체', '탄수화물', '크레파스', '사각팬티',
].map(relay)

// ── 사자성어 ──
const idiom = [
  '다다익선', '마이동풍', '천고마비', '배은망덕', '동문서답', '유비무환', '오매불망', '근하신년', '섬섬옥수', '왈가왈부',
  '유유상종', '견물생심', '설상가상', '금상첨화', '조삼모사', '함흥차사', '자업자득', '고진감래', '용두사미', '조령모개',
].map(relay)

// ── 음식·먹거리 (길수록 꿀잼) ──
const food = [
  '삼겹살구이', '부대찌개', '김치볶음밥', '순두부찌개', '마라샹궈', '양념치킨', '곱창전골', '회오리감자', '로제파스타', '제육볶음',
  '아메리카노', '카페모카', '크림파스타', '소떡소떡', '떡볶이', '닭갈비', '감자탕', '탕수육', '짜장면', '순대국밥',
].map(relay)

// ── 나라·도시 (혀 꼬이는 지명) ──
const places = [
  '아르헨티나', '오스트레일리아', '인도네시아', '방글라데시', '아프가니스탄', '우즈베키스탄', '룩셈부르크', '에티오피아', '마다가스카르', '코펜하겐',
  '요하네스버그', '이스탄불', '바르셀로나', '로스앤젤레스', '샌프란시스코', '카사블랑카', '리우데자네이루', '헬싱키', '두브로브니크', '몬테네그로',
].map(relay)

// ── 영화·시리즈 ──
const movie = [
  '오징어게임', '인터스텔라', '트랜스포머', '미션임파서블', '스파이더맨', '인사이드아웃', '쥬라기공원', '어벤져스', '캡틴아메리카', '아이언맨',
  '캐리비안의해적', '반지의제왕', '해리포터', '겨울왕국', '기생충', '극한직업', '알라딘', '라라랜드', '인셉션', '매트릭스',
].map(relay)

// ── 브랜드·앱 ──
const brand = [
  '스타벅스', '맥도날드', '코카콜라', '아디다스', '삼성전자', '현대자동차', '배스킨라빈스', '던킨도너츠', '롯데리아', '파리바게뜨',
  '뚜레쥬르', '유니클로', '카카오톡', '인스타그램', '넷플릭스', '유튜브', '무신사', '컬리', '토스뱅크', '스포티파이',
].map(relay)

// ── 아이돌·가수 ──
const idol = [
  '블랙핑크', '방탄소년단', '스트레이키즈', '레드벨벳', '소녀시대', '원더걸스', '오마이걸', '르세라핌', '트와이스', '세븐틴',
  '에스파', '아이브', '뉴진스', '엔믹스', '빅뱅', '엑소', '샤이니', '인피니트', '마마무', '아이유',
].map(relay)

// ── 고난도 (긴 단어·전문용어) ──
const hard = [
  '스트렙토마이신', '데옥시리보핵산', '미토콘드리아', '트리케라톱스', '아나필락시스', '아드레날린', '콜레스테롤', '커뮤니케이션', '오리엔테이션', '인프라스트럭처',
  '아이덴티티', '메타버스', '블록체인', '알고리즘', '프로페셔널', '인터내셔널', '엔돌핀', '나노테크놀로지', '하이퍼링크', '멀티태스킹',
].map(relay)

// ── 술자리·MT (분위기 UP) ──
const party = [
  '부어라마셔라', '원샷필수', '러브샷', '흑기사', '폭탄주', '진실게임', '이상형월드컵', '아이엠그라운드', '눈치게임', '바니바니',
  '텔레파시', '흑역사', '주량자랑', '밤샘토크', '삼세번', '뒷담화', '노가리', '건배사', '치맥타임', '해장국',
].map(relay)

// ── 속담 (앞부분 → 뒷부분 공개형) ──
const proverb = [
  ['다 된 밥에', '재 뿌린다'],
  ['콩 심은 데 콩 나고', '팥 심은 데 팥 난다'],
  ['떡 줄 사람은 생각도 안 하는데', '김칫국부터 마신다'],
  ['귀에 걸면 귀걸이', '코에 걸면 코걸이'],
  ['열 길 물 속은 알아도', '한 길 사람 속은 모른다'],
  ['서당개 삼 년이면', '풍월을 읊는다'],
  ['어물전 망신은', '꼴뚜기가 시킨다'],
  ['아닌 밤중에', '홍두깨'],
  ['구슬이 서 말이라도', '꿰어야 보배'],
  ['누워서', '떡 먹기'],
  ['계란으로', '바위치기'],
  ['티끌 모아', '태산'],
  ['천 리 길도', '한 걸음부터'],
  ['닭 쫓던 개', '지붕 쳐다본다'],
  ['까마귀 날자', '배 떨어진다'],
  ['구르는 돌이', '박힌 돌 뺀다'],
  ['원수는', '외나무다리에서 만난다'],
  ['강 건너', '불구경'],
  ['소 잃고', '외양간 고친다'],
  ['하늘이 무너져도', '솟아날 구멍은 있다'],
].map(([text, answer]) => ({ text, answer }))

const SUBSETS = [
  { key: 'daily', label: '일상단어', cards: daily },
  { key: 'food', label: '음식·먹거리', cards: food },
  { key: 'places', label: '나라·도시', cards: places },
  { key: 'movie', label: '영화·시리즈', cards: movie },
  { key: 'brand', label: '브랜드·앱', cards: brand },
  { key: 'idol', label: '아이돌·가수', cards: idol },
  { key: 'idiom', label: '사자성어', cards: idiom },
  { key: 'hard', label: '고난도', cards: hard },
  { key: 'party', label: '술자리·MT', cards: party },
  { key: 'proverb', label: '속담(공개형)', cards: proverb },
]
const subsetByKey = (k) => SUBSETS.find((s) => s.key === k) || null
const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')

// 카드 → 정답 판별 함수. 뒷부분만 써도, 통째로 써도 정답 인정.
const matcher = (card) => {
  if (!card) return () => false
  const full = norm((card.text || '') + (card.answer || ''))
  const tail = norm(card.answer)
  return (t) => {
    const n = norm(t)
    return !!n && (n === tail || n === full)
  }
}

const shuffle = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 카드 넘길 때 초기화할 필드
const resetCard = (extra) => ({ revealed: false, ans: null, awarded: null, ...extra })

/* ───────── 호스트 ───────── */
function HostView({ roomId, base, players, teams }) {
  const subset = useValue(`${base}/subset`)
  const order = useValue(`${base}/order`)
  const idx = useValue(`${base}/idx`) || 0
  const revealed = useValue(`${base}/revealed`)
  const ansRaw = useValue(`${base}/ans`)
  const awarded = useValue(`${base}/awarded`) // 1등 정답자 pid

  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  // 훅은 조기 반환 위에서 전부 계산 (subset 없으면 cur가 undefined일 뿐)
  const curDeck = subsetByKey(subset)
  const curCard = curDeck?.cards?.[order?.[idx]]
  const match = matcher(curCard)
  const submissions = useMemo(
    () =>
      toList(ansRaw)
        .map((a) => ({ id: a.id, text: a.text, ts: a.ts, p: byId[a.id] }))
        .filter((a) => a.p && typeof a.ts === 'number')
        .sort((x, y) => x.ts - y.ts),
    [ansRaw, byId]
  )
  const winner = submissions.find((s) => match(s.text)) || null

  // 자동 채점 — 첫 정답자에게 팀 +1. 호스트 화면이 여러 개여도 트랜잭션으로 1회만.
  // cur가 있으면 중단(undefined 반환 → 커밋 안 됨)이라 '내가 방금 잠갔을 때'만 점수를 준다.
  // 취소 가드(alive)를 두면 안 된다: 트랜잭션의 로컬 반영으로 awarded가 즉시 바뀌면서
  // await가 끝나기 전에 cleanup이 돌아 지급이 통째로 스킵된다. 중복은 트랜잭션이 막아준다.
  useEffect(() => {
    if (!winner || awarded) return
    ;(async () => {
      const res = await dbTransaction(`${base}/awarded`, (cur) => (cur ? undefined : winner.id))
      if (!res.committed || res.snapshot.val() !== winner.id) return
      dbSet(`${base}/revealed`, true)
      if (winner.p.teamId) addTeamScore(roomId, winner.p.teamId, 1)
    })()
  }, [winner?.id, winner?.p?.teamId, awarded, base, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 세트 선택 전
  if (!subset) {
    return (
      <div className="text-center">
        <p className="font-display text-xl mb-4">🎤 어떤 세트로 할까요?</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {SUBSETS.map((s) => (
            <button
              key={s.key}
              onClick={() => dbSet(base, { subset: s.key, order: shuffle(s.cards.length), idx: 0, ...resetCard() })}
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

  const deck = curDeck
  const total = order?.length || 0
  const cur = curCard
  const atEnd = idx >= total - 1

  const go = (d) => dbUpdate(base, { idx: Math.min(total - 1, Math.max(0, idx + d)), ...resetCard() })
  const reshuffle = () => dbUpdate(base, { order: shuffle(total), idx: 0, ...resetCard() })

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-3">
        <span className="clay-inset px-3 py-1 text-sm font-bold">{deck?.label} · {idx + 1}/{total}</span>
        <button onClick={() => dbSet(base, null)} className="text-sm clay-btn px-3 py-1" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>🔄 다른 세트</button>
      </div>

      {/* 카드 (앞부분) */}
      <div className="clay-inset py-8 px-4 min-h-[120px] flex flex-col items-center justify-center">
        <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>이어서 입력하세요 👇</div>
        <div className="font-display text-5xl leading-tight">{cur?.text || '—'}<span style={{ color: 'var(--ink-soft)' }}>…</span></div>
        {cur?.answer && (revealed
          ? <div className="font-display text-3xl mt-3 animate-pop" style={{ color: 'var(--c-mint)' }}>→ {cur.answer}</div>
          : <div className="mt-3 text-2xl" style={{ color: 'var(--ink-soft)' }}>❓</div>)}
      </div>

      {/* 1등 배너 — 자동 지급됨 */}
      {winner && (
        <div className="mt-4 clay p-3 animate-pop max-w-lg mx-auto" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="font-display text-2xl">🏆 {winner.p.nickname} 1등!</div>
          <div className="text-sm mt-0.5 opacity-90">
            {teamById[winner.p.teamId]?.name ? `${teamById[winner.p.teamId].name} +1점 자동 지급` : '팀이 없어 점수는 못 줬어요'}
          </div>
        </div>
      )}

      {/* 제출 (도착 순서대로) — 판정은 자동 */}
      <div className="mt-4 max-w-lg mx-auto text-left space-y-1.5">
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>📥 도착한 답 ({submissions.length}) · 자동 채점</div>
        {submissions.map((s, i) => {
          const team = teamById[s.p.teamId]
          const ok = match(s.text)
          const first = winner?.id === s.id
          return (
            <div key={s.id} className="clay-inset px-3 py-2 flex items-center gap-2" style={first ? { outline: '2px solid var(--c-mint)' } : {}}>
              <span className="font-display text-sm w-5 shrink-0" style={{ color: 'var(--ink-soft)' }}>{i + 1}</span>
              <span className="font-bold shrink-0">{s.p.nickname}</span>
              {team && <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: team.color, color: '#fff' }}>{team.name}</span>}
              <span className="flex-1 min-w-0 truncate">{s.text}</span>
              <span className="text-lg shrink-0">{first ? '🏆' : ok ? '✅' : '❌'}</span>
            </div>
          )
        })}
        {!submissions.length && <p className="text-sm py-2" style={{ color: 'var(--ink-soft)' }}>참가자 입력 대기 중…</p>}
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Button variant="ghost" onClick={() => go(-1)} disabled={idx === 0}>◀ 이전</Button>
        {cur?.answer && !revealed && <Button variant="warn" onClick={() => dbSet(`${base}/revealed`, true)}>👁 정답</Button>}
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
  const mine = useValue(`${base}/ans/${me.id}`)
  const awarded = useValue(`${base}/awarded`)
  const [text, setText] = useState('')

  // 카드가 바뀌면 입력창 비우기
  useEffect(() => { setText('') }, [idx, subset])

  if (!subset) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl">🎤</div>
        <p className="mt-3 font-display text-xl">호스트가 세트를 고르는 중…</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>메인 화면을 봐주세요!</p>
      </div>
    )
  }

  const deck = subsetByKey(subset)
  const cur = deck?.cards?.[order?.[idx]]
  const match = matcher(cur)
  const myOk = !!mine && match(mine.text)
  const iWon = !!awarded && awarded === me.id
  const winnerName = awarded ? players.find((p) => p.id === awarded)?.nickname || '누군가' : null
  // 이미 맞혔으면 잠금. 틀렸으면 다시 낼 수 있다.
  const submit = () => {
    const t = text.trim()
    if (!t || myOk) return
    dbSet(`${base}/ans/${me.id}`, { text: t, ts: SERVER_TS })
  }

  return (
    <div className="text-center">
      <p style={{ color: 'var(--ink-soft)' }}>「{cur?.text || '—'}」 다음을 이어서!</p>
      <div className="font-display text-3xl mt-1">{cur?.text}<span style={{ color: 'var(--ink-soft)' }}>…</span></div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={myOk}
        className="mt-3 w-full clay-inset px-4 py-4 text-xl text-center disabled:opacity-50"
        placeholder={myOk ? '맞혔어요!' : '이어서 입력!'}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim() || myOk}>
        {myOk ? '✅ 정답' : mine ? '다시 제출' : '제출'}
      </Button>

      {iWon ? (
        <p className="mt-3 font-display text-2xl animate-pop" style={{ color: 'var(--c-mint)' }}>🏆 1등 정답! 우리 팀 +1</p>
      ) : myOk ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-mint)' }}>✅ 정답! {winnerName ? `아쉽게도 ${winnerName} 님이 먼저 😢` : ''}</p>
      ) : mine ? (
        <p className="mt-3 font-display" style={{ color: 'var(--c-coral)' }}>❌ 땡! 「{mine.text}」 · 다시 도전 🔥</p>
      ) : awarded ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>{winnerName} 님이 먼저 맞혔어요</p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>먼저 맞히는 사람이 팀에 +1 🏆</p>
      )}
    </div>
  )
}

export default {
  id: 'wordrelay',
  name: '이어 말하기',
  emoji: '🎤',
  tagline: '앞 2글자 보고 폰으로 이어쓰기 · 맞힌 팀 +1',
  genres: ['brain'],
  traits: ['team'],
  controls: { mode: 'self' }, // 세트/카드/정답/점수를 게임이 자체 관리
  HostView,
  PlayerView,
}
