import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // WSL/로컬 모두 접근 가능
    port: 5173,
    strictPort: true,
    // WSL에서 Windows 브라우저로 접속할 때 HMR(WebSocket) 주소가 꼬이거나
    // 프록시/포워딩 환경에서 ws 연결이 실패하는 케이스를 방지합니다.
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
    // /mnt/c 에서 파일 변경 감지가 불안정할 수 있어 폴링을 켭니다.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
