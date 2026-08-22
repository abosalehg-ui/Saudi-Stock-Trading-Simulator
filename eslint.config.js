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
    rules: {
      ...sharedRules,
      // Route every markup insertion through setHtml() + the auto-escaping
      // html`` tag in src/ui/dom.js, which owns the only audited innerHTML
      // sink (and disables this rule on that one line).
      //
      // The previous version specified `object: 'element'`, which matches a
      // variable *literally named* `element`. None of the six real sinks were,
      // so the rule flagged nothing and an unescaped
      // `div.innerHTML = ` + '`<b>${input}</b>`' + ` passed lint clean. Matching
      // on the property alone is what makes it bite; 'error' rather than
      // 'warn' because a warning that never fails CI is not a guard.
      //
      // Scoped to src/: a test that builds its own fixture from a string
      // literal is not a sink, and making tests route through setHtml() would
      // be ceremony without safety.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use setHtml(host, html`...`) from ui/dom.js.' },
        { property: 'outerHTML', message: 'Use setHtml(host, html`...`) from ui/dom.js.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'Use setHtml(host, html`...`) from ui/dom.js.',
        },
      ],
    },
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
