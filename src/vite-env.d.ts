/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WISH_NOTIFY_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
