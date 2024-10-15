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
    PUBLIC_URL: process.env.PUBLIC_URL,
    REACT_APP_SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
    REACT_APP_GIT_SHA: process.env.REACT_APP_GIT_SHA,
    REACT_APP_VALIDATE_URL: process.env.REACT_APP_VALIDATE_URL,
    REACT_APP_STORAGE_URL: process.env.REACT_APP_STORAGE_URL,
  }
})
