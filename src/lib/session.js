// 회원가입 없이 닉네임만으로 세션 유지: localStorage 에 playerId/nickname/roomId 보관.
const KEY = 'agw.session'

const genId = () =>
  'p_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function saveSession(patch) {
  const next = { ...getSession(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

// 방별 playerId 를 확보 (없으면 생성). 같은 폰에서 새로고침해도 동일 세션 유지.
export function ensurePlayerId() {
  const s = getSession()
  if (s.playerId) return s.playerId
  const id = genId()
  saveSession({ playerId: id })
  return id
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
