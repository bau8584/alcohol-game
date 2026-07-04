import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, roomExists } from '../lib/actions'
import { Button, Card } from '../components/ui'

export default function Home() {
  const nav = useNavigate()
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const makeRoom = async () => {
    if (pin.length < 4) return setErr('호스트 PIN은 4자리 이상 권장')
    setBusy(true)
    try {
      const roomId = await createRoom(pin)
      localStorage.setItem(`agw.host.${roomId}`, '1')
      nav(`/host/${roomId}`)
    } catch (e) {
      setErr('방 생성 실패: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const join = async () => {
    const c = code.trim()
    if (!c) return
    setBusy(true)
    if (await roomExists(c)) nav(`/play/${c}`)
    else setErr('존재하지 않는 방 코드입니다.')
    setBusy(false)
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <h1 className="text-5xl font-black">🍻 술게임 아레나</h1>
        <p className="mt-2 text-white/50">메인 스크린 + 스마트폰으로 즐기는 실시간 팀 대항전</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl">
        <Card>
          <h2 className="text-xl font-black mb-1">🖥️ 호스트 (메인 스크린)</h2>
          <p className="text-sm text-white/50 mb-3">방을 만들고 게임을 진행합니다.</p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="호스트 PIN (숫자)"
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none mb-3"
          />
          <Button className="w-full" onClick={makeRoom} disabled={busy}>
            방 만들기
          </Button>
        </Card>

        <Card>
          <h2 className="text-xl font-black mb-1">📱 참가자 (스마트폰)</h2>
          <p className="text-sm text-white/50 mb-3">방 코드를 입력해 접속합니다.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="6자리 방 코드"
            className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none mb-3 tracking-widest text-center text-lg"
          />
          <Button variant="ghost" className="w-full" onClick={join} disabled={busy}>
            참가하기
          </Button>
        </Card>
      </div>
      {err && <p className="text-rose-400">{err}</p>}
    </div>
  )
}
