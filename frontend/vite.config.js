import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    globals: true,
    include: ['src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // Ensure Vitest uses the React plugin for JSX transform in test files
    plugins: [react()],
  },
})
