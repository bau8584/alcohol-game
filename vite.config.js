import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// PORT 환경변수가 있으면 그 포트에 고정(로컬 프리뷰 도구용). 없으면 기존처럼 5173 자동.
const port = process.env.PORT ? Number(process.env.PORT) : undefined

export default defineConfig({
  plugins: [react()],
  server: port ? { port, strictPort: true } : {},
})
