import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Lets you open the dev server from your phone on the same Wi-Fi.
    host: true,
    port: 5173,
  },
  build: {
    // @react-pdf/renderer is large; this keeps the warning noise down without
    // hiding genuinely oversized bundles.
    chunkSizeWarningLimit: 1200,
  },
});
