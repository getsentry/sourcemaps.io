/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NODE_ENV: string;
  readonly PUBLIC_URL: string;
  readonly REACT_APP_SENTRY_DSN: string;
  readonly REACT_APP_GIT_SHA: string;
  readonly REACT_APP_VALIDATE_URL: string;
  readonly REACT_APP_STORAGE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
