# 🍻 술게임 아레나 (Alcohol Game Web)

메인 스크린(Host) + 스마트폰(Player)으로 즐기는 **30명 규모 실시간 팀 대항 술게임 웹앱**.

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Realtime DB**: Firebase Realtime Database (RTDB)
- **Hosting**: Cloudflare Pages
- **인증**: 회원가입 없음 — 닉네임만으로 세션 유지 (localStorage)

---

## 🎮 게임 10종 (모듈식)

| # | 게임 | type | 설명 |
|---|------|------|------|
| 1 | 노래 부저 | `buzzer` | 서버 타임스탬프 밀리초 최초 터치 판정 |
| 2 | 팀원 지목 | `target` | 실시간 득표 게이지 |
| 3 | 줄줄이 말해요 | `relay` | 순차 입력 타임밤 릴레이 (+진동) |
| 4 | 싱크로 텔레파시 | `sync` | 텍스트 일치 자동 집계 |
| 5 | 라이어 게임 | `liar` | 개별 비공개 역할 전송 |
| 6 | 시크릿 시그널 | `mafia` | 암전 + 마피아 전용 익명 채팅 |
| 7 | 블라인드 옥션 | `auction` | 패스권 봉인 입찰 · 최저가 벌칙 |
| 8 | 동기화 센서 | `teamsync` | 팀별 A/B 싱크율 |
| 9 | 롤링 마인드 | `rolling` | 익명 고백 롤링페이퍼 |
| 10 | 밀리초 데시벨 | `tap` | 팀별 연타 합산 레이싱 |

> **게임 추가는 파일 하나면 끝.** `src/games/새게임.jsx` 를 만들고 `{ id, name, emoji, tagline, promptLabel, HostView, PlayerView }` 를 export → `src/games/registry.js` 배열에 추가.

---

## 1. Firebase 준비

1. [Firebase 콘솔](https://console.firebase.google.com) → **프로젝트 추가**.
2. 좌측 **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치는 아무 곳(예: `asia-southeast1`), 시작은 **잠금 모드**로 생성 후 아래 규칙으로 교체.
3. **프로젝트 설정(⚙️) → 내 앱 → 웹 앱 추가(</>)** → 표시되는 `firebaseConfig` 값 확보.
   - 특히 `databaseURL` (예: `https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app`) 필수.

### 보안 규칙 적용
`database.rules.json` 내용을 **Realtime Database → 규칙** 탭에 붙여넣고 게시.

```json
{
  "rules": {
    "rooms": { "$roomId": { ".read": true, ".write": true } }
  }
}
```

> ⚠️ **보안 안내**: 이 규칙은 방(`/rooms`) 데이터를 **누구나 읽고 쓸 수 있게** 열어 둡니다.
> 오프라인 지인 모임용으로는 충분하지만, 불특정 다수 공개 서비스에는 부적합합니다.
> 호스트 PIN은 UI 게이팅용이며 클라이언트에서 비교하므로 **실제 보안 장치가 아닙니다.**
> 강화하려면 Firebase Anonymous Auth + 규칙에서 `auth != null` 및 방별 접근 검증을 추가하세요.

---

## 2. 로컬 실행

```bash
cp .env.example .env      # 그리고 .env 에 Firebase 값 채우기
npm install
npm run dev               # http://localhost:5173
```

- 호스트: `http://localhost:5173/` → “방 만들기” → `/host/{코드}`
- 참가자: 다른 기기/탭에서 `/` → 방 코드 입력, 또는 `http://localhost:5173/play/{코드}`

> 같은 와이파이의 실제 스마트폰으로 테스트하려면 `npm run dev -- --host` 후 PC의 로컬 IP로 접속.

---

## 3. Cloudflare Pages 배포

### 방법 A) 대시보드 (Git 연동)
1. GitHub 등에 이 저장소 push.
2. Cloudflare 대시보드 → **Workers & Pages → Create → Pages → Connect to Git**.
3. 빌드 설정:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Settings → Environment variables** 에 `.env` 의 `VITE_...` 값을 모두 등록 (Production/Preview 양쪽).
5. Deploy. SPA 라우팅은 `public/_redirects` 가 처리합니다.

### 방법 B) CLI (Wrangler)
```bash
npm run build
npx wrangler pages deploy dist --project-name alcohol-game
```
> 이 경우 빌드 시점에 `.env` 값이 번들에 포함되므로 로컬 `.env` 를 채운 뒤 빌드하세요.

---

## 4. 진행 방식 (호스트 수동 제어)

1. 참가자들이 닉네임 입력 → **팀 선택**(보드/인스/스키).
2. 호스트가 게임 목록에서 하나 선택 → 필요 시 **문제/미션 텍스트** 입력.
3. **▶ 진행 시작**(입력/부저 오픈) → **👁 결과 공개** → 하단 **정산 패널**에서 점수·쿠폰 지급/차감.
4. **🔄 새 라운드**로 같은 게임 반복, **게임 목록으로** 로 다른 게임 전환.

## 재화(쿠폰) 시스템
`src/config/items.js` 배열만 수정하면 쿠폰 종류가 늘어납니다. `scope: 'personal' | 'team'` 으로 개인/팀 재화를 구분하며, 시작 지급량(`startQty`)도 여기서 설정합니다. (기본: 패스권·찬스권·훔치기권·팀 방패)

## 데이터 구조 요약 (RTDB)
```
rooms/{roomId}/
  meta/   { hostPin, phase, activeGameId, roundStatus, roundSeq, prompt }
  players/{playerId}/ { nickname, teamId, connected, items:{...} }
  teams/{board|ins|ski}/ { score, items:{...} }
  play/{roundSeq}/{gameId}/ ...   # 게임별 상호작용 데이터(라운드마다 자동 격리)
```

## 팀/색상 변경
`src/config/teams.js` 에서 팀 id·이름·색상·이모지 수정. 색상은 `tailwind.config.js` 커스텀 컬러와 맞추면 됩니다.
