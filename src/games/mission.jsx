// 양세찬 게임 (콜 마이 네임) — 각자에게 비밀 단어(인물/제시어) 배분.
// 이마 카드 = 웹으로: 내 폰엔 '남들의 단어'는 다 보이지만 '내 단어'만 비밀(❓).
// 남들 걸 보며 스무고개로 질문해서 내 단어를 맞힌다.
import { useMemo } from 'react'
import { useValue, dbUpdate } from '../lib/db'

const DECKS = [
  { id: 'star', label: '연예인', words: ['아이유', '유재석', '손흥민', '카리나', '정국', '강호동', '김연아', '백종원', '지드래곤', '박명수', '이효리', '제니', '뷔', '차은우', '나훈아', '임영웅', '싸이', '박보검', '아이린', '김종국'] },
  { id: 'animal', label: '동물', words: ['사자', '펭귄', '코알라', '기린', '고슴도치', '문어', '나무늘보', '캥거루', '판다', '햄스터', '미어캣', '수달', '알파카', '하마', '치타', '두더지', '카피바라', '돌고래'] },
  { id: 'food', label: '음식', words: ['치킨', '떡볶이', '김치찌개', '초밥', '마라탕', '피자', '곱창', '삼겹살', '파스타', '냉면', '붕어빵', '탕수육', '족발', '순대', '김밥', '라면', '갈비', '해장국'] },
  { id: 'char', label: '캐릭터', words: ['뽀로로', '짱구', '도라에몽', '피카츄', '스폰지밥', '헬로키티', '미키마우스', '라이언', '어피치', '잔망루피', '무민', '쿠로미', '둘리', '마리오', '엘사', '올라프'] },
  { id: 'job', label: '직업', words: ['의사', '소방관', '경찰', '유튜버', '아이돌', '요리사', '변호사', '프로게이머', '승무원', '파일럿', '교사', '개그맨', '아나운서', '농부', '건물주', '수의사'] },
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HostView({ base, meta, players }) {
  const words = useValue(`${base}/word`)
  const theme = useValue(`${base}/theme`)
  const reveal = meta.roundStatus === 'reveal'

  const assign = (deck) => {
    if (players.length < 2) return alert('최소 2명 필요.')
    const pool = shuffle(deck.words)
    const map = {}
    players.forEach((p, i) => (map[p.id] = pool[i % pool.length]))
    dbUpdate(base, { word: map, theme: deck.label })
  }

  return (
    <div className="text-center">
      <p className="font-display text-lg">🃏 각자 이마에 단어! 내 폰엔 남들 단어만 보여요</p>
      <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>남들 걸 보고 질문해서 내 단어(인물)를 맞히기 · 첫 글자 직접 묻기 금지</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {DECKS.map((d) => (
          <button key={d.id} onClick={() => assign(d)} className="clay-btn px-4 py-2 font-display" style={theme === d.label ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
            🎲 {d.label}
          </button>
        ))}
      </div>

      {words && (
        <div className="mt-4">
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>주제: <b style={{ color: 'var(--ink)' }}>{theme}</b> {reveal ? '· 정답 공개!' : '(진행자만 전체 보기)'}</div>
          <div className="grid gap-2 max-w-xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {players.map((p) => (
              <div key={p.id} className="clay-inset px-3 py-2 text-left">
                <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.nickname}</div>
                <div className="font-display text-lg">{words[p.id] || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerView({ base, meta, players, me }) {
  const words = useValue(`${base}/word`)
  const theme = useValue(`${base}/theme`)
  const reveal = meta.roundStatus === 'reveal'
  const others = useMemo(() => players.filter((p) => p.id !== me.id), [players, me.id])

  if (!words) return <p className="text-center" style={{ color: 'var(--ink-soft)' }}>진행자가 단어 배분 중… 🃏</p>

  return (
    <div className="text-center">
      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>주제: <b style={{ color: 'var(--ink)' }}>{theme}</b></div>

      {reveal ? (
        <div className="clay p-5 mt-2" style={{ background: 'var(--c-mint)', color: '#fff' }}>
          <div className="opacity-80">내 단어는…</div>
          <div className="font-display text-4xl mt-1">{words[me.id] || '—'}</div>
          <p className="mt-1 opacity-90">맞혔나요? 😏</p>
        </div>
      ) : (
        <div className="clay p-4 mt-2" style={{ background: 'var(--surface-2)' }}>
          <div className="font-display text-3xl">❓ 나</div>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>내 단어는 비밀! 질문해서 맞혀요</p>
        </div>
      )}

      <div className="mt-4 text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>👀 다른 사람들의 단어 (이마)</div>
      <div className="grid grid-cols-2 gap-2">
        {others.map((p) => (
          <div key={p.id} className="clay-inset px-3 py-2 text-left">
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.nickname}</div>
            <div className="font-display text-lg">{words[p.id] || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default {
  id: 'callmyname',
  name: '양세찬 게임',
  emoji: '🃏',
  tagline: '이마 단어 · 질문으로 맞히기',
  genres: ['mind', 'party'],
  traits: ['solo'],
  controls: { prompt: false },
  HostView,
  PlayerView,
}
