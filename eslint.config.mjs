import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: ['**/dist/**', '**/dist-check/**', '**/node_modules/**'],
  files: ['packages/**/*.ts'],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
});
