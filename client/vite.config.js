import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Plugins extend Vite. react() enables React; tailwindcss() enables Tailwind styling.
  plugins: [react(), tailwindcss()],
})
