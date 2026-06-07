import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const copy404 = {
  name: 'copy-index-to-404',
  closeBundle() {
    fs.copyFileSync('dist/index.html', 'dist/404.html');
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    copy404,
  ],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    host: true,
    port: 5175,
  }
})
