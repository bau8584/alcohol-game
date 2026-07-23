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

// 🔰 입문 추천 — 규칙이 자명하고 즉각적이라 처음 모임에서 바로 굴러가는 게임.
// 게임 선택 화면에서 배지·필터·상단 정렬에 쓴다.
export const BEGINNER_IDS = ['tap', 'chicken', 'timing', 'sync', 'eunchi', 'pick']
export const isBeginner = (id) => BEGINNER_IDS.includes(id)

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
