import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'prisma/seed.ts'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
      globals: globals.node,
    },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
