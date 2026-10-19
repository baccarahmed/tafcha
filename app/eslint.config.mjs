import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['.next/**', 'dist/**', 'node_modules/**', 'next-env.d.ts']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Plugins enregistrés sur tous les fichiers, sans `files` : la détection du
    // plugin par `next build` évalue le config file lui-même (eslint.config.mjs),
    // qui ne matche pas `**/*.{ts,tsx}`. Sans ce bloc, Next émet
    // « The Next.js plugin was not detected in your ESLint configuration ».
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'next.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Service worker : `self`, `clients`, `registration`… sont des globals
    // navigateur propres au contexte service worker.
    files: ['public/sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
])