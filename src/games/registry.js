// 게임 모듈 레지스트리. 새 게임은 파일 추가 후 이 배열에 넣기만 하면 됩니다.
// 각 모듈: { id, name, emoji, tagline, genres, traits, promptLabel, HostView, PlayerView }
import buzzer from './buzzer.jsx'
import tap from './tap.jsx'
import pick from './pick.jsx'
import herd from './herd.jsx'
import eunchi from './eunchi.jsx'
import timing from './timing.jsx'
import chicken from './chicken.jsx'
import spy from './spy.jsx'
import sync from './sync.jsx'
import rolling from './rolling.jsx'
import jinseonmi from './jinseonmi.jsx'
import faces from './faces.jsx'
import charades from './decks/charades.js'
import wordrelay from './decks/wordrelay.jsx'
import category from './decks/category.js'
import roulette from './roulette.jsx'
import king from './king.jsx'
import whodunit from './whodunit.jsx'
import wavelength from './wavelength.jsx'
import mission from './mission.jsx'
import oxtruth from './oxtruth.jsx'
import mbti from './mbti.jsx'
import heartsignal from './heartsignal.jsx'
import uniquenum from './uniquenum.jsx'
import telematch from './telematch.jsx'
import greenlight from './greenlight.jsx'
import themind from './themind.jsx'
import croc from './croc.jsx'
import imagegame from './imagegame.jsx'
import justone from './justone.jsx'
import indianpoker from './indianpoker.jsx'
import ranksync from './ranksync.jsx'
import codenames from './codenames.jsx'
import werewolf from './werewolf.jsx'

export const GAMES = [buzzer, tap, timing, chicken, greenlight, pick, herd, eunchi, uniquenum, indianpoker, spy, sync, telematch, ranksync, rolling, jinseonmi, faces, charades, wordrelay, category, roulette, king, codenames, whodunit, wavelength, mission, oxtruth, mbti, heartsignal, themind, croc, imagegame, justone, werewolf]

export const gameById = (id) => GAMES.find((g) => g.id === id) || null

// 🎮 상황·목적 카테고리 — 게임 선택 화면을 접이식 묶음으로 보여주기 위한 매핑.
// 게임 파일은 안 건드리고 여기서만 배치. 어느 묶음에도 없는 게임은 gamesByCategory()가 '기타'로 넣는다.
export const CATEGORIES = [
  { key: 'instant', emoji: '⚡', label: '즉석 반응·벌칙', ids: ['buzzer', 'tap', 'timing', 'chicken', 'greenlight', 'eunchi', 'faces', 'roulette', 'king', 'croc'] },
  { key: 'mind', emoji: '🕵️', label: '심리·정체·추리', ids: ['uniquenum', 'indianpoker', 'spy', 'whodunit', 'oxtruth', 'mbti', 'imagegame', 'werewolf'] },
  { key: 'vote', emoji: '🗳️', label: '지목·평판', ids: ['pick', 'herd', 'jinseonmi'] },
  { key: 'telepathy', emoji: '📡', label: '텔레파시·이심전심', ids: ['sync', 'telematch', 'ranksync', 'wavelength', 'themind', 'justone'] },
  { key: 'express', emoji: '🎭', label: '표현·말·단어', ids: ['charades', 'wordrelay', 'category', 'codenames', 'callmyname'] },
  { key: 'relation', emoji: '💘', label: '관계·솔직', ids: ['rolling', 'heartsignal'] },
]

// 카테고리별로 실제 게임 모듈을 묶어 반환. 누락 게임은 '기타'로 자동 포함(사라지지 않게).
export function gamesByCategory() {
  const assigned = new Set()
  const groups = CATEGORIES.map((c) => {
    const games = c.ids.map((id) => gameById(id)).filter(Boolean)
    games.forEach((g) => assigned.add(g.id))
    return { key: c.key, emoji: c.emoji, label: c.label, games }
  }).filter((c) => c.games.length)
  const rest = GAMES.filter((g) => !assigned.has(g.id))
  if (rest.length) groups.push({ key: 'etc', emoji: '🎲', label: '기타', games: rest })
  return groups
}

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
