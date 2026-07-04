// 게임 모듈 레지스트리. 새 게임은 파일 추가 후 이 배열에 넣기만 하면 됩니다.
// 각 모듈: { id, name, emoji, tagline, genres, traits, promptLabel, HostView, PlayerView }
import buzzer from './buzzer.jsx'
import tap from './tap.jsx'
import pick from './pick.jsx'
import teamsync from './teamsync.jsx'
import eunchi from './eunchi.jsx'
import spy from './spy.jsx'
import battle from './battle.jsx'
import sync from './sync.jsx'
import rolling from './rolling.jsx'
import jinseonmi from './jinseonmi.jsx'
import faces from './faces.jsx'
import charades from './decks/charades.js'
import wordrelay from './decks/wordrelay.js'
import category from './decks/category.js'
import roulette from './roulette.jsx'

export const GAMES = [buzzer, tap, pick, teamsync, eunchi, spy, battle, sync, rolling, jinseonmi, faces, charades, wordrelay, category, roulette]

export const gameById = (id) => GAMES.find((g) => g.id === id) || null

// 태그 분류: 장르(성격) + 속성(형식)
export const GENRES = [
  { id: 'physical', label: '피지컬', emoji: '⚡' },
  { id: 'brain', label: '두뇌·순발력', emoji: '🧠' },
  { id: 'mind', label: '심리·추리', emoji: '🕵️' },
  { id: 'telepathy', label: '텔레파시', emoji: '📡' },
  { id: 'party', label: '표현·파티', emoji: '🎭' },
]

export const TRAITS = [
  { id: 'team', label: '팀전', emoji: '👥' },
  { id: 'solo', label: '개인전', emoji: '🧍' },
  { id: 'anon', label: '익명', emoji: '🙈' },
]

const GENRE_MAP = Object.fromEntries(GENRES.map((t) => [t.id, t]))
const TRAIT_MAP = Object.fromEntries(TRAITS.map((t) => [t.id, t]))
export const genreById = (id) => GENRE_MAP[id] || null
export const traitById = (id) => TRAIT_MAP[id] || null
