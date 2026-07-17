import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createRoom, roomExists,
  ensureFixedRoom, seedRoster, joinRoom, setPlayerTeam, markPlayerSeed,
  SB_TEST_ROOM_ID, SB_HOST_PIN,
} from '../lib/actions'
import { ensurePlayerId, saveSession } from '../lib/session'
import { Button } from '../components/ui'
import ThemeSwitcher from '../components/ThemeSwitcher'

const clayInput =
  'clay-inset w-full px-5 py-4 text-center text-2xl tracking-widest bg-[var(--surface)] outline-none placeholder:text-[var(--ink-soft)] placeholder:tracking-normal placeholder:text-base'
const HOST_KEY = (roomId) => `agw.host.${roomId}`

export default function Home() {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [created, setCreated] = useState(null) // { roomId, hostPin }
  const [joinCode, setJoinCode] = useState('')

  // ── 방 만들기 (호스트) ──
  const makeRoom = async () => {
    setBusy(true); setErr('')
    try {
      const { roomId, hostPin } = await createRoom()
      localStorage.setItem(HOST_KEY(roomId), hostPin) // 만든 기기는 자동 호스트 인증
      setCreated({ roomId, hostPin })
    } catch (e) {
      setErr('방 생성 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  // ── 코드로 참가 ──
  const join = async (dest) => {
    const code = joinCode.trim()
    if (code.length < 4) return setErr('방 코드를 입력해주세요')
    setBusy(true); setErr('')
    try {
      if (!(await roomExists(code))) { setErr('그런 방이 없어요. 코드를 확인해주세요'); setBusy(false); return }
      nav(`/${dest}/${code}`)
    } catch (e) {
      setErr('입장 실패: ' + e.message)
      setBusy(false)
    }
  }

  // ── 개발용 테스트 (별도 테스트 방 SBTEST) ──
  const testHost = async () => {
    setBusy(true)
    try {
      await ensureFixedRoom(SB_TEST_ROOM_ID)
      await seedRoster(SB_TEST_ROOM_ID)
      localStorage.setItem(HOST_KEY(SB_TEST_ROOM_ID), SB_HOST_PIN)
      nav(`/host/${SB_TEST_ROOM_ID}`)
    } catch (e) { setErr('테스트 실패: ' + e.message); setBusy(false) }
  }
  const testPlayer = async () => {
    setBusy(true)
    try {
      await ensureFixedRoom(SB_TEST_ROOM_ID)
      await seedRoster(SB_TEST_ROOM_ID)
      const pid = ensurePlayerId()
      saveSession({ nickname: '테스터', roomId: SB_TEST_ROOM_ID })
      await joinRoom(SB_TEST_ROOM_ID, pid, '테스터')
      await setPlayerTeam(SB_TEST_ROOM_ID, pid, 'ski')
      await markPlayerSeed(SB_TEST_ROOM_ID, pid)
      nav(`/play/${SB_TEST_ROOM_ID}`)
    } catch (e) { setErr('테스트 실패: ' + e.message); setBusy(false) }
  }

  // ── 방 생성 완료 화면 ──
  if (created) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6 relative">
        <ThemeSwitcher className="absolute top-4 right-4" />
        <div className="text-center animate-pop">
          <div className="text-6xl">🎉</div>
          <h1 className="font-display mt-2 text-3xl">방이 만들어졌어요!</h1>
        </div>

        <div className="clay p-6 bg-[var(--surface)] w-full max-w-xs text-center space-y-4">
          <div>
            <div className="text-sm text-[var(--ink-soft)]">방 코드 · 참가자에게 공유</div>
            <div className="font-display text-5xl tracking-widest mt-1 text-[var(--c-grape)]">{created.roomId}</div>
          </div>
          <div className="clay-inset py-3">
            <div className="text-sm text-[var(--ink-soft)]">🔑 호스트 PIN</div>
            <div className="font-display text-3xl tracking-widest">{created.hostPin}</div>
            <div className="text-xs mt-1 text-[var(--ink-soft)] px-3">
              다른 기기·브라우저에서 호스트로 들어올 때 필요해요. 메모해두세요.
            </div>
          </div>
          <Button className="w-full text-xl py-4" onClick={() => nav(`/host/${created.roomId}`)} disabled={busy}>
            🖥️ 호스트 화면으로 입장
          </Button>
        </div>

        <button onClick={() => setCreated(null)} className="text-sm text-[var(--ink-soft)] underline">← 처음으로</button>
      </div>
    )
  }

  // ── 메인 메뉴 ──
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6 relative">
      <ThemeSwitcher className="absolute top-4 right-4" />

      <div className="text-center animate-pop">
        <div className="text-7xl">🍻</div>
        <h1 className="font-display mt-3 text-5xl text-[var(--ink)]">술게임 아레나</h1>
        <p className="mt-2 text-[var(--ink-soft)]">방을 만들어 코드를 공유하고, 다 같이 폰으로!</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {/* 호스트: 방 만들기 */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">🖥️ 호스트</div>
          <Button className="w-full text-2xl py-5" onClick={makeRoom} disabled={busy}>
            ✨ 새 방 만들기
          </Button>
          <p className="text-sm text-[var(--ink-soft)]">코드·PIN 자동 발급 → 바로 시작</p>
        </div>

        {/* 참가자: 코드로 입장 */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">📱 참가자</div>
          <input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
            inputMode="numeric"
            placeholder="방 코드 6자리"
            className={clayInput}
            onKeyDown={(e) => e.key === 'Enter' && join('play')}
          />
          <Button variant="ghost" className="w-full" onClick={() => join('play')} disabled={busy || !joinCode}>
            🎉 참가하기
          </Button>
          <button
            onClick={() => join('tv')}
            disabled={busy || !joinCode}
            className="text-sm text-[var(--ink-soft)] underline disabled:opacity-40"
          >
            📺 이 코드로 큰 화면(TV)만 띄우기
          </button>
        </div>
      </div>

      {/* 개발용 테스트 (명단 시드 후 입장) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--ink-soft)]">🧪 테스트</span>
        <button onClick={testHost} disabled={busy} className="clay-btn font-display px-3 py-1.5 text-sm" style={{ background: 'var(--c-sky)', color: '#fff' }}>
          호스트
        </button>
        <button onClick={testPlayer} disabled={busy} className="clay-btn font-display px-3 py-1.5 text-sm" style={{ background: 'var(--c-pink)', color: '#fff' }}>
          참가자
        </button>
      </div>

      {err && <p className="text-[var(--c-coral)] font-bold text-center">{err}</p>}
    </div>
  )
}
