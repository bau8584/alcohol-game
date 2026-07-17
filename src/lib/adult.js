// 성인(19금) 콘텐츠 자가확인 동의 — 기기별 localStorage에 1회 기억.
// 법적 완화책: '만 19세 이상' 자가확인 게이트(청소년보호법 취지의 최소 조치).
const KEY = 'agw.adult.ok'

export const hasAdultConsent = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export const setAdultConsent = (v) => {
  try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
