module.exports = {
  parser: '@typescript-eslint/parser', // Use TypeScript parser
  // Environment: Node.js (no browser globals)
  env: {
    node: true,
    es2021: true,
  },

  // Extend recommended ESLint rules
  extends: ['eslint:recommended'],

  // Parser options (if using ES modules or advanced JS)
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'graphile-export'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:graphile-export/recommended',
  ],

  // Custom rules (override defaults)
  rules: {
    'no-console': 'off', // Warn on console.log()
    'no-unused-vars': 'off', // Warning on unused variables
    semi: ['error', 'never'], // Enforce no semicolons
    quotes: ['error', 'single'], // Enforce single quotes
    indent: ['error', 2], // 2-space indentation
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-empty-pattern': 'off',
    indent: 'off',
  },
}
