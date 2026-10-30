import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/core/**/*.ts', 'src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'Core and domain must remain React-independent.' }],
      }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    files: ['*.config.{ts,js}', 'tests/**/*.{ts,cjs}'],
    languageOptions: { globals: globals.node },
  },
  { files: ['tests/browser/**/*.cjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['**/*.{js,cjs}'], extends: [js.configs.recommended] },
])

