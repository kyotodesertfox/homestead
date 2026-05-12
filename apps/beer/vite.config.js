import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/beer/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    host: true,
    port: 5173,
  }
})
