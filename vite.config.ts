import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // 自訂網域 videotools.junenaga.com 直接掛在根路徑
  base: '/',
  plugins: [react()],
  // @ffmpeg/ffmpeg 內部用 new Worker(new URL('./worker.js', import.meta.url)) 找 Worker 檔，
  // 被預先打包後路徑會錯，所以 @ffmpeg/ffmpeg 要排除
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  worker: { format: 'es' },
  // 只測不需要瀏覽器就能驗證的純邏輯；ffmpeg 的實際執行要靠瀏覽器，不在這裡
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
