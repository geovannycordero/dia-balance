import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginImportX from 'eslint-plugin-import-x';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Additional project-wide rules.
  {
    plugins: {
      'import-x': eslintPluginImportX,
    },
    rules: {
      // TypeScript best practices — plugin registered by eslint-config-next
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // Import hygiene
      'no-duplicate-imports': 'error',
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // General code quality
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'warn',
      'no-debugger': 'error',
      'no-console': [
        'warn',
        {
          allow:
            process.env.NODE_ENV === 'development'
              ? ['warn', 'error', 'info', 'debug', 'trace', 'log']
              : ['warn', 'error'],
        },
      ],
    },
  },
  // Disable formatting-related rules that might conflict with Prettier.
  eslintConfigPrettier,
]);

export default eslintConfig;
