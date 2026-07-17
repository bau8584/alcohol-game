import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureFixedRoom, seedRoster, clearSeeds, joinRoom, setPlayerTeam, markPlayerSeed, SB_ROOM_ID, SB_HOST_PIN, SB_TEST_ROOM_ID } from '../lib/actions'
import { ensurePlayerId, saveSession } from '../lib/session'
import { Button } from '../components/ui'
import ThemeSwitcher from '../components/ThemeSwitcher'

const clayInput =
  'clay-inset w-full px-5 py-4 text-center text-lg bg-[var(--surface)] outline-none placeholder:text-[var(--ink-soft)]'

export default function Home() {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [hostPin, setHostPin] = useState('')
  const [err, setErr] = useState('')

  const sbJoin = async () => {
    setBusy(true)
    try {
      await ensureFixedRoom()
      await clearSeeds(SB_ROOM_ID) // 실제 입장 시 테스트 명단 자동 제거
      nav(`/play/${SB_ROOM_ID}`)
    } catch (e) {
      setErr('입장 실패: ' + e.message)
      setBusy(false)
    }
  }

  const sbHost = async () => {
    if (hostPin !== SB_HOST_PIN) return setErr('호스트 비밀번호가 달라요')
    setBusy(true)
    try {
      await ensureFixedRoom()
      await clearSeeds(SB_ROOM_ID) // 실제 호스트 입장 시 테스트 명단 자동 제거
      localStorage.setItem(`agw.host.${SB_ROOM_ID}`, hostPin) // 실제 PIN 저장(자동 인증은 DB 대조로만)
      nav(`/host/${SB_ROOM_ID}`)
    } catch (e) {
      setErr('입장 실패: ' + e.message)
      setBusy(false)
    }
  }

  // ── 개발용 테스트: 별도 테스트 방(SBTEST)에 명단 시드 후 입장 (실전 SB 방은 안 건드림) ──
  const testHost = async () => {
    setBusy(true)
    try {
      await ensureFixedRoom(SB_TEST_ROOM_ID)
      await seedRoster(SB_TEST_ROOM_ID)
      localStorage.setItem(`agw.host.${SB_TEST_ROOM_ID}`, SB_HOST_PIN) // 테스트 방도 실제 PIN 저장
      nav(`/host/${SB_TEST_ROOM_ID}`)
    } catch (e) {
      setErr('테스트 실패: ' + e.message)
      setBusy(false)
    }
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
      await markPlayerSeed(SB_TEST_ROOM_ID, pid) // 초기화/테스트 명단 지우기로 함께 제거되도록 표시
      nav(`/play/${SB_TEST_ROOM_ID}`)
    } catch (e) {
      setErr('테스트 실패: ' + e.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6 relative">
      <ThemeSwitcher className="absolute top-4 right-4" />

      <div className="text-center animate-pop">
        <div className="text-7xl">🍻</div>
        <h1 className="font-display mt-3 text-5xl text-[var(--ink)]">술게임 아레나</h1>
        <p className="mt-2 text-[var(--ink-soft)]">이번 MT 테스트 운영 · 방 하나로 진행</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {/* 참가자 */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">📱 참가자</div>
          <Button className="w-full text-2xl py-5" onClick={sbJoin} disabled={busy}>
            🎉 SB 입장
          </Button>
          <p className="text-sm text-[var(--ink-soft)]">닉네임 → 팀 선택 후 바로 시작!</p>
        </div>

        {/* 호스트 */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">🖥️ 호스트 (큰 화면)</div>
          <input
            value={hostPin}
            onChange={(e) => { setHostPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr('') }}
            inputMode="numeric"
            placeholder="호스트 비밀번호"
            className={clayInput}
            onKeyDown={(e) => e.key === 'Enter' && sbHost()}
          />
          <Button variant="ghost" className="w-full" onClick={sbHost} disabled={busy}>
            호스트 입장
          </Button>
        </div>

        {/* 화면 전용 — 아이패드·노트북·TV가 '화면 역할'만 하며 들어옴 (참가자로 안 잡힘) */}
        <div className="clay p-5 bg-[var(--surface)] space-y-3 text-center">
          <div className="text-lg font-bold">📺 화면으로 입장</div>
          <Button variant="ghost" className="w-full" onClick={() => nav(`/tv/${SB_ROOM_ID}`)} disabled={busy}>
            화면 전용 입장
          </Button>
          <p className="text-sm text-[var(--ink-soft)]">아이패드·노트북·TV를 다 같이 보는 화면으로. 조작 없음.</p>
        </div>
      </div>

      {/* 개발용 테스트 버튼 (명단 29명 자동 배정 후 입장) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--ink-soft)]">🧪 테스트</span>
        <button
          onClick={testHost}
          disabled={busy}
          className="clay-btn font-display px-3 py-1.5 text-sm"
          style={{ background: 'var(--c-sky)', color: '#fff' }}
        >
          호스트
        </button>
        <button
          onClick={testPlayer}
          disabled={busy}
          className="clay-btn font-display px-3 py-1.5 text-sm"
          style={{ background: 'var(--c-pink)', color: '#fff' }}
        >
          참가자
        </button>
      </div>

      {err && <p className="text-[var(--c-coral)] font-bold">{err}</p>}
    </div>
  )
}
