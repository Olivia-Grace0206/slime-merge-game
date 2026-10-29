import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Prepare for a future project Pages site. This does not publish anything.
  base: '/slime-merge-game/',
  plugins: [react()],
})
