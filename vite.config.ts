import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { include: ['tests/**/*.test.ts'] },
})
