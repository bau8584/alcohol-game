import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Firebase 웹 설정값. 이 값들은 브라우저(클라이언트)에 원래 공개되는 값이라
// 코드에 직접 넣어도 안전합니다. 실제 접근 제어는 Realtime Database "규칙"이 담당합니다.
// (로컬에서 .env 로 값을 넣으면 그게 우선 적용됩니다.)
const FALLBACK = {
  apiKey: 'AIzaSyC67WtxQNEUg6gVHljMCHxGWLI1XLYiEX8',
  authDomain: 'alcohol-game-db.firebaseapp.com',
  databaseURL:
    'https://alcohol-game-db-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'alcohol-game-db',
  appId: '1:948350213948:web:7ee5156f190cb5f0ec0839',
}

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || FALLBACK.databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK.appId,
}

const app = initializeApp(cfg)
export const db = getDatabase(app)
