import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works at https://<user>.github.io/signalledger/
  base: './',
  // Allow access through remote preview proxies (otherwise Vite shows "Blocked request")
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
})
