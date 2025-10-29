import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite serves frontend; /api/* is handled by Vercel functions.
// No special proxy is needed in production.
// In dev, you still call http://localhost:5173/api/* which Vite will 404,
// so the client code falls back to calling YGOPRODeck directly.
// (That’s by design to keep dev simple.)
export default defineConfig({
  plugins: [react()],
  // If you deploy under a subpath on Vercel (rare), set base accordingly.
  // base: '/',
  build: {
    sourcemap: true,
  },
})
