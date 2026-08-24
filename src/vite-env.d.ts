/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHEETS_WEBHOOK_URL?: string;
  readonly VITE_SHEETS_SYNC_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
