import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist',
      'build',
      'node_modules',
      'logs',
      '*.log',
      '*.db',
      '*.sqlite',
      'uploads',
      '.DS_Store',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ignores: ['tests/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@eslint/js': js,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-unreachable': 'off',
      'no-unused-expressions': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-fallthrough': 'off',
      eqeqeq: 'off',
      curly: 'off',
      'no-var': 'error',
      'prefer-const': 'off',
    },
  },
  {
    files: ['tests/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
