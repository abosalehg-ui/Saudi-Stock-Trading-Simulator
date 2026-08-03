import js from '@eslint/js';
import globals from 'globals';

const sharedRules = {
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'prefer-const': 'error',
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  // `t` (the translator) was being shadowed by a `forEach((t) => ...)` param.
  'no-shadow': 'error',
  // Every innerHTML sink must go through escapeHtml(); flag raw assignment so
  // a future one can't quietly skip it.
  'no-restricted-properties': [
    'warn',
    { object: 'element', property: 'innerHTML', message: 'Build nodes or escape via escapeHtml().' },
  ],
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: sharedRules,
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // Tests run in vitest's jsdom environment: both Node and browser
      // globals (document, KeyboardEvent, ...) are legitimately in scope.
      globals: {
        ...globals.node,
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: { ...sharedRules, 'no-console': 'off' },
  },
];
