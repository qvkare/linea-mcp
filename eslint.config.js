// eslint.config.js
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  // Global ignores first
  {
     ignores: ['node_modules/**', 'dist/**']
  },
  // Apply base recommended configurations
  ...tseslint.configs.recommended,

  // Custom configuration object
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        }
      ],
      'no-console': 'off',
    },
    // No longer need ignores here as it's global
  }
];
