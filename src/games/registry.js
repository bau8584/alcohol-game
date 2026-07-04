// 게임 모듈 레지스트리. 새 게임은 파일 추가 후 이 배열에 넣기만 하면 됩니다.
// 각 모듈: { id, name, emoji, tagline, promptLabel, HostView, PlayerView }
import buzzer from './buzzer.jsx'
import pick from './pick.jsx'
import role from './role.jsx'
import type from './type.jsx'
import auction from './auction.jsx'

export const GAMES = [buzzer, pick, role, type, auction]

export const gameById = (id) => GAMES.find((g) => g.id === id) || null
