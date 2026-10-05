import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './scripts/content-plugin.ts'

// base './' 덕분에 GitHub Pages 경로(blog.cdd.co.kr/travel/)와 상관없이 동작합니다.
// contentPlugin이 content/의 YAML을 검사해 `virtual:trips`로 넘겨줍니다.
export default defineConfig({
  base: './',
  plugins: [react(), contentPlugin()],
})
