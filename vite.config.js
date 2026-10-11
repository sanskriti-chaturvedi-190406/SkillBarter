import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  input: {
    main: resolve(import.meta.dirname, 'index.html'),
    skills: resolve(import.meta.dirname, 'skills.html'),
    admin: resolve(import.meta.dirname, 'admin.html'),
    sessions: resolve(import.meta.dirname, 'src/features/sessions/sessions.html'),
  },
})
