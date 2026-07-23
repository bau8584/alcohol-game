import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createRoom, roomExists,
  ensureFixedRoom, seedRoster, joinRoom, setPlayerTeam, markPlayerSeed,
  SB_TEST_ROOM_ID, SB_HOST_PIN,
} from '../lib/actions'
import { ensurePlayerId, saveSession } from '../lib/session'
import { Button } from '../components/ui'
import JoinQR from '../components/JoinQR'
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
      await setPlayerTeam(SB_TEST_ROOM_ID, pid, 'strawberry')
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
          <div className="flex flex-col items-center gap-1">
            <JoinQR url={`${location.origin}/play/${created.roomId}`} size={180} />
            <div className="text-xs text-[var(--ink-soft)]">📷 카메라로 스캔하면 바로 참가!</div>
          </div>
          <div className="clay-inset py-3">
            <div className="text-sm text-[var(--ink-soft)]">🔑 호스트 PIN <span className="text-xs">(선택)</span></div>
            <div className="font-display text-3xl tracking-widest">{created.hostPin}</div>
            <div className="text-xs mt-1 text-[var(--ink-soft)] px-3">
              지금 이 기기는 그냥 입장하면 돼요. PIN은 <b>다른 기기</b>에서 진행자로 들어올 때만 필요해요.
            </div>
          </div>
          <div className="space-y-2">
            <Button className="w-full text-xl py-4" onClick={() => nav(`/host/${created.roomId}`)} disabled={busy}>
              🖥️ 호스트 화면으로 입장
            </Button>
            <Button variant="ghost" className="w-full py-3" onClick={() => nav(`/play/${created.roomId}`)} disabled={busy}>
              📱 참가자로 입장
            </Button>
          </div>
          <p className="text-xs text-[var(--ink-soft)]">호스트 권한은 이 기기에 저장돼요. 참가자로 들어가도 나중에 호스트로 다시 올 수 있어요.</p>
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

        {/* 코드로 입장: 참가자 or 공용 화면 (둘 다 방 코드 필요) */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">📱 코드로 입장</div>
          <input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
            inputMode="numeric"
            placeholder="방 코드 6자리"
            className={clayInput}
            onKeyDown={(e) => e.key === 'Enter' && join('play')}
          />
          <Button className="w-full" onClick={() => join('play')} disabled={busy || !joinCode}>
            🎉 참가자로 입장
          </Button>

          {/* 공용 화면(관전용) — 참가자도 진행자도 아닌 '다 같이 보는 화면' */}
          <div className="pt-3 mt-1 border-t" style={{ borderColor: 'var(--surface-2)' }}>
            <button
              onClick={() => join('tv')}
              disabled={busy || !joinCode}
              className="clay-btn w-full py-2.5 font-bold text-sm disabled:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              📺 공용 화면으로 띄우기
            </button>
            <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>
              TV·모니터에 띄워 다 같이 보는 관전 화면 · 조작·참여 없음
            </p>
          </div>
        </div>
      </div>

      {/* 개발용 테스트 (명단 시드 후 입장) — 개발 모드에서만 노출 */}
      {import.meta.env.DEV && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ink-soft)]">🧪 테스트</span>
          <button onClick={testHost} disabled={busy} className="clay-btn font-display px-3 py-1.5 text-sm" style={{ background: 'var(--c-sky)', color: '#fff' }}>
            호스트
          </button>
          <button onClick={testPlayer} disabled={busy} className="clay-btn font-display px-3 py-1.5 text-sm" style={{ background: 'var(--c-pink)', color: '#fff' }}>
            참가자
          </button>
        </div>
      )}

      {err && <p className="text-[var(--c-coral)] font-bold text-center">{err}</p>}
    </div>
  )
}
