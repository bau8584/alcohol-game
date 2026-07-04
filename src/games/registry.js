// 게임 모듈 레지스트리. 새 게임을 추가하려면 파일을 만들고 여기 배열에 넣기만 하면 됩니다.
// 각 모듈 형태: { id, name, emoji, tagline, minPlayers, HostView, PlayerView }
import buzzer from './buzzer.jsx'
import target from './target.jsx'
import relay from './relay.jsx'
import sync from './sync.jsx'
import liar from './liar.jsx'
import mafia from './mafia.jsx'
import auction from './auction.jsx'
import teamsync from './teamsync.jsx'
import rolling from './rolling.jsx'
import tap from './tap.jsx'

export const GAMES = [buzzer, target, relay, sync, liar, mafia, auction, teamsync, rolling, tap]

export const gameById = (id) => GAMES.find((g) => g.id === id) || null
