import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: 'REACT_APP_',
  plugins: [react()],
  build: {
    outDir: './build',
  },
  define: {
    PUBLIC_URL: JSON.stringify(process.env.PUBLIC_URL),
    REACT_APP_SENTRY_DSN: JSON.stringify(process.env.REACT_APP_SENTRY_DSN),
    REACT_APP_GIT_SHA: JSON.stringify(process.env.REACT_APP_GIT_SHA),
    REACT_APP_VALIDATE_URL: JSON.stringify(process.env.REACT_APP_VALIDATE_URL),
    REACT_APP_STORAGE_URL: JSON.stringify(process.env.REACT_APP_STORAGE_URL),
  }
})
