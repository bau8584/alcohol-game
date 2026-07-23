// 저스트원 (Just One) — 협동. 한 명(맞히는 사람)만 제시어를 못 본다.
// 나머지는 제시어를 보고 각자 '한 단어' 힌트를 쓰는데, 겹치는 힌트는 자동 소거(같은 생각=무효).
// 살아남은 힌트만 맞히는 사람에게 보이고, 그걸로 정답을 외친다. 성공=다 함께 / 실패=맞히는 사람 벌칙.
// 핵심: 제시어는 공용 화면(TV/HostView)에 절대 안 띄운다(맞히는 사람이 봐도 안전) — 비-술래 폰에만 표시.
import { useEffect, useMemo, useState } from 'react'
import { useValue, dbSet, dbUpdate, dbTransaction, toList } from '../lib/db'
import { Button } from '../components/ui'

// 맞히기 좋은 구체 명사 (한 단어)
const WORDS = [
  '사과', '바나나', '피자', '치킨', '커피', '라면', '김치', '초콜릿', '수박', '딸기',
  '바다', '산', '달', '별', '무지개', '눈사람', '번개', '화산', '사막', '폭포',
  '지하철', '비행기', '자전거', '우산', '안경', '시계', '냉장고', '세탁기', '청소기', '드론',
  '강아지', '고양이', '펭귄', '공룡', '상어', '문어', '나비', '코끼리', '기린', '햄스터',
  '축구', '야구', '농구', '수영', '스키', '요가', '복싱', '마라톤', '볼링', '당구',
  '산타', '좀비', '유령', '마법사', '로봇', '외계인', '슈퍼맨', '인어', '천사', '해적',
  '병원', '학교', '공항', '놀이공원', '도서관', '목욕탕', '편의점', '노래방', '캠핑', '영화관',
  '로또', '월급', '방학', '소개팅', '결혼식', '다이어트', '알람', '숙취', '첫사랑', '눈치',
  '셀카', '이모티콘', '와이파이', '배달', '택배', '리모컨', '충전기', '거울', '향수', '지갑',
  '경찰', '소방관', '의사', '요리사', '가수', '배우', '유튜버', '선생님', '운전기사', '미용사',
]

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '')
const rand = () => WORDS[Math.floor(Math.random() * WORDS.length)]

function useNameOf(players) {
  return useMemo(() => {
    const byId = Object.fromEntries(players.map((p) => [p.id, p.nickname]))
    return (pid) => byId[pid] || '?'
  }, [players])
}

// 힌트 판정: 겹침(같은 단어 2명 이상)·제시어와 동일·호스트가 지운 것 = 무효
function resolveClues(cluesRaw, struckRaw, word, guesserId) {
  const list = toList(cluesRaw)
    .map((c) => ({ pid: c.id, text: typeof c.value === 'string' ? c.value : '' }))
    .filter((c) => c.pid !== guesserId && c.text.trim())
  const counts = {}
  list.forEach((c) => { counts[norm(c.text)] = (counts[norm(c.text)] || 0) + 1 })
  const wn = norm(word)
  return list.map((c) => {
    const dup = counts[norm(c.text)] > 1
    const sameAsWord = norm(c.text) === wn
    const struck = !!struckRaw?.[c.pid]
    return { ...c, dup, sameAsWord, struck, dead: dup || sameAsWord || struck }
  })
}

/* ───────────── 호스트 (공용 화면 — 제시어 비공개) ───────────── */
function HostView({ base, meta, players }) {
  const word = useValue(`${base}/word`)
  const guesserId = useValue(`${base}/guesserId`)
  const cluesRaw = useValue(`${base}/clues`)
  const struckRaw = useValue(`${base}/struck`)
  const result = useValue(`${base}/result`)
  const nameOf = useNameOf(players)
  const staged = meta.roundStatus === 'staged'
  const reveal = meta.roundStatus === 'reveal'

  // 제시어 자동 준비(비밀) — staged에서 비어 있으면 한 번 자동 채움
  useEffect(() => {
    if (!staged || word) return
    dbTransaction(`${base}/word`, (cur) => cur || rand())
  }, [staged, word, base])

  const clues = useMemo(() => resolveClues(cluesRaw, struckRaw, word, guesserId), [cluesRaw, struckRaw, word, guesserId])
  const survivors = clues.filter((c) => !c.dead)
  const guessers = players.filter((p) => p.id === guesserId)
  const givers = players.filter((p) => p.id !== guesserId)
  const wrote = clues.length
  const guesserName = guessers[0]?.nickname

  const pickGuesser = (pid) => dbUpdate(base, { guesserId: pid, clues: null, struck: null, result: null })
  const reroll = () => dbSet(`${base}/word`, rand())
  const toggleStrike = (pid) => dbSet(`${base}/struck/${pid}`, struckRaw?.[pid] ? null : true)

  return (
    <div className="text-center">
      <div className="font-display text-xl">🙈 협동! 맞히는 사람만 제시어를 못 봐요</div>

      {staged && (
        <div className="mt-4 max-w-lg mx-auto">
          <div className="clay-inset px-3 py-2 mb-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
            제시어는 <b>비밀</b>이라 이 화면엔 안 떠요. 비-술래 폰에만 보입니다 🤫
            <button onClick={reroll} className="ml-2 underline">🎲 제시어 바꾸기</button>
          </div>
          <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>🙈 맞히는 사람을 고르세요</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => pickGuesser(p.id)}
                className="clay-btn px-3 py-1.5 text-sm font-bold"
                style={guesserId === p.id ? { background: 'var(--c-grape)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}
              >
                {p.nickname}
              </button>
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
            {guesserId
              ? `맞히는 사람: ${guesserName} · 시작을 누르면 나머지 ${givers.length}명이 힌트 작성`
              : '먼저 맞히는 사람을 고르세요 (최소 3명 권장)'}
          </div>
        </div>
      )}

      {!staged && !reveal && (
        <div className="mt-4">
          <div className="clay-inset inline-block px-4 py-2">🙈 맞히는 사람 <b>{guesserName || '?'}</b></div>
          <div className="mt-3" style={{ color: 'var(--ink-soft)' }}>
            힌트 작성 <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{wrote}</span> / {givers.length}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>제시어는 각자 폰으로 · 다 쓰면 👁 공개</div>
        </div>
      )}

      {reveal && (
        <div className="mt-4 space-y-3">
          <div className="clay-inset inline-block px-4 py-2">
            제시어 <span className="font-display text-2xl" style={{ color: 'var(--c-grape)' }}>{word}</span>
            <span className="mx-2" style={{ color: 'var(--ink-soft)' }}>·</span>
            🙈 {guesserName}
          </div>

          <div>
            <div className="text-sm mb-1" style={{ color: 'var(--c-mint)' }}>✅ 살아남은 힌트 (맞히는 사람에게 공개)</div>
            <div className="flex flex-wrap justify-center gap-2">
              {survivors.map((c) => (
                <span key={c.pid} className="clay-inset px-3 py-1.5 font-bold" style={{ background: 'var(--c-mint)', color: '#fff' }}>{c.text}</span>
              ))}
              {!survivors.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>다 겹쳤어요 😵 살아남은 힌트가 없네요.</span>}
            </div>
          </div>

          <div>
            <div className="text-sm mb-1" style={{ color: 'var(--ink-soft)' }}>전체 힌트 (겹치거나 반칙이면 무효 · 눌러서 직접 무효 처리)</div>
            <div className="flex flex-wrap justify-center gap-2">
              {clues.map((c) => (
                <button
                  key={c.pid}
                  onClick={() => toggleStrike(c.pid)}
                  className="clay-inset px-3 py-1.5 text-sm"
                  style={c.dead ? { textDecoration: 'line-through', color: 'var(--c-coral)' } : {}}
                  title={c.dup ? '겹침(무효)' : c.sameAsWord ? '제시어와 동일(무효)' : c.struck ? '직접 무효' : '유효'}
                >
                  {c.text} <span style={{ color: 'var(--ink-soft)' }}>· {nameOf(c.pid)}</span>
                </button>
              ))}
              {!clues.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>작성된 힌트가 없어요.</span>}
            </div>
          </div>

          <div className="pt-1">
            {result ? (
              <div className="clay p-3 animate-pop max-w-sm mx-auto" style={{ background: result === 'success' ? 'var(--c-mint)' : 'var(--c-coral)', color: '#fff' }}>
                <div className="font-display text-2xl">{result === 'success' ? '🎉 정답! 다 같이 성공' : '😵 실패 — 맞히는 사람 벌칙 🍺'}</div>
              </div>
            ) : (
              <div className="flex justify-center gap-2">
                <Button variant="ok" onClick={() => dbSet(`${base}/result`, 'success')}>✅ 맞혔다!</Button>
                <Button variant="danger" onClick={() => dbSet(`${base}/result`, 'fail')}>❌ 실패</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── 플레이어 ───────────── */
function PlayerView({ base, meta, players, me }) {
  const word = useValue(`${base}/word`)
  const guesserId = useValue(`${base}/guesserId`)
  const cluesRaw = useValue(`${base}/clues`)
  const struckRaw = useValue(`${base}/struck`)
  const mine = useValue(`${base}/clues/${me.id}`)
  const [text, setText] = useState('')
  const open = meta.roundStatus === 'open'
  const reveal = meta.roundStatus === 'reveal'
  const staged = meta.roundStatus === 'staged'
  const iAmGuesser = guesserId === me.id

  useEffect(() => { setText(typeof mine === 'string' ? mine : '') }, [mine, meta.roundSeq])

  const clues = useMemo(() => resolveClues(cluesRaw, struckRaw, word, guesserId), [cluesRaw, struckRaw, word, guesserId])
  const survivors = clues.filter((c) => !c.dead)
  const myClue = clues.find((c) => c.pid === me.id)

  if (staged) {
    return (
      <div className="text-center py-10" style={{ color: 'var(--ink-soft)' }}>
        <div className="text-5xl mb-2">🤫</div>
        진행자가 맞히는 사람을 정하는 중…
        {iAmGuesser && <div className="mt-2 font-display" style={{ color: 'var(--c-grape)' }}>당신이 맞히는 사람이 될 거예요!</div>}
      </div>
    )
  }

  // 맞히는 사람 — 제시어를 절대 안 보여줌
  if (iAmGuesser) {
    return (
      <div className="text-center">
        <div className="clay p-4" style={{ background: 'var(--c-grape)', color: '#fff' }}>
          <div className="text-5xl">🙈</div>
          <div className="font-display text-2xl mt-1">당신은 맞히는 사람!</div>
          <div className="opacity-90 text-sm mt-1">제시어는 볼 수 없어요</div>
        </div>
        {!reveal ? (
          <p className="mt-4" style={{ color: 'var(--ink-soft)' }}>다른 사람들이 힌트 작성 중… 잠시만요</p>
        ) : (
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--c-mint)' }}>💡 힌트로 정답을 외쳐보세요!</div>
            <div className="flex flex-wrap justify-center gap-2">
              {survivors.map((c) => (
                <span key={c.pid} className="clay-inset px-4 py-2 font-display text-xl" style={{ background: 'var(--c-mint)', color: '#fff' }}>{c.text}</span>
              ))}
              {!survivors.length && <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>힌트가 다 겹쳤어요 😵</span>}
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>진행자가 성공/실패를 판정해요</p>
          </div>
        )}
      </div>
    )
  }

  // 힌트 주는 사람 (비-술래)
  const submit = () => { const t = text.trim(); if (t && open) dbSet(`${base}/clues/${me.id}`, t) }

  if (reveal) {
    return (
      <div className="text-center">
        <div style={{ color: 'var(--ink-soft)' }}>제시어</div>
        <div className="font-display text-4xl">{word}</div>
        <div className="mt-3">
          {myClue ? (
            myClue.dead ? (
              <p className="font-display" style={{ color: 'var(--c-coral)' }}>내 힌트 「{myClue.text}」 무효 {myClue.dup ? '(겹침 💥)' : myClue.sameAsWord ? '(제시어와 동일)' : '(제외됨)'}</p>
            ) : (
              <p className="font-display" style={{ color: 'var(--c-mint)' }}>✅ 내 힌트 「{myClue.text}」 살아남음!</p>
            )
          ) : (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>이번엔 힌트를 안 냈어요</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      {open ? (
        <>
          <div style={{ color: 'var(--ink-soft)' }}>제시어</div>
          <div className="font-display text-5xl mb-1">{word || '…'}</div>
          <p className="text-sm mb-3" style={{ color: 'var(--ink-soft)' }}>이걸 떠올리게 할 <b>한 단어</b> 힌트! (겹치면 무효)</p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="힌트 한 단어"
            className="clay-inset w-full px-4 py-4 text-2xl text-center"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim()}>
            {mine ? '힌트 수정' : '힌트 제출'}
          </Button>
          {mine && <p className="mt-2 text-sm" style={{ color: 'var(--c-mint)' }}>제출됨: 「{mine}」 · 공개 전까지 수정 가능</p>}
        </>
      ) : (
        <p className="py-10" style={{ color: 'var(--ink-soft)' }}>진행자 대기 중…</p>
      )}
    </div>
  )
}

export default {
  id: 'justone',
  name: '저스트원',
  emoji: '💡',
  tagline: '협동 · 겹치는 힌트는 무효 · 다 같이 정답 맞히기',
  genres: ['brain', 'party'],
  traits: [],
  HostView,
  PlayerView,
}
