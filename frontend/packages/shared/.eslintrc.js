module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // Enforce lucide-react icons to use XxxIcon naming convention
    // This pattern matches icon names that do NOT end with "Icon"
    // e.g., "Cpu" will be flagged, but "CpuIcon" will pass
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['lucide-react'],
            // Match imports that start with uppercase letter but don't end with "Icon"
            // Exceptions: LucideIcon (type), LucideProps (type), createLucideIcon (function)
            importNamePattern:
              '^(?!LucideIcon$|LucideProps$|createLucideIcon$)[A-Z][a-zA-Z]*(?<!Icon)$',
            message: 'Import icons with "Icon" suffix only (e.g., use "CpuIcon" instead of "Cpu")'
          }
        ]
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  ignorePatterns: ['node_modules/', 'dist/']
};
