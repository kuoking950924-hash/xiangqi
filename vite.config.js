import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base 設定為 repo 名稱，讓 GitHub Pages 能正確載入資源路徑
// 上傳到 GitHub 後，repo 名稱若不是 xiangqi，請把下面這行改成你的 repo 名稱
export default defineConfig({
  base: '/xiangqi/',
  plugins: [react()],
})
