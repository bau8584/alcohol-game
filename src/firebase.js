import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// .env 값이 없으면 개발자가 바로 알 수 있도록 경고
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!cfg.databaseURL) {
  // RTDB 는 databaseURL 이 없으면 아무것도 동작하지 않으므로 명시적으로 알림.
  // getDatabase() 가 import 시점에 throw 해 앱 전체가 흰 화면이 되는 걸 막기 위해
  // 플레이스홀더 URL 을 넣어 렌더는 되게 하고, 실제 DB 사용 시점에만 실패하도록 함.
  console.error(
    '[firebase] VITE_FIREBASE_DATABASE_URL 이 비어 있습니다. .env 를 설정하세요 (.env.example 참고).'
  )
  cfg.databaseURL = 'https://placeholder-default-rtdb.firebaseio.com'
}

const app = initializeApp(cfg)
export const db = getDatabase(app)
