import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' 덕분에 GitHub Pages 저장소 이름과 상관없이 동작합니다.
export default defineConfig({
  base: './',
  plugins: [react()],
})
