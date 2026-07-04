// 테마 4종 전환 + localStorage 저장.
export const THEMES = [
  { id: 'grape', name: '그레이프', emoji: '🍇' },
  { id: 'peach', name: '피치', emoji: '🍑' },
  { id: 'mint', name: '민트', emoji: '🌿' },
  { id: 'dark', name: '다크', emoji: '🌙' },
]

const KEY = 'agw.theme'

export function getTheme() {
  return localStorage.getItem(KEY) || 'grape'
}

export function applyTheme(id) {
  document.documentElement.dataset.theme = id
  localStorage.setItem(KEY, id)
}

// 앱 시작 시 저장된 테마 적용
export function initTheme() {
  applyTheme(getTheme())
}
