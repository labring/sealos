import nextJest from 'next/jest.js'
import path from 'path';
const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename)
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    "^nanoid(/(.*)|$)": "nanoid$1"
  },
  testSequencer:'./src/__tests__/jest-sequencer.cjs',
  testMatch: ['**/__tests__/**/*.test.ts'],
  maxWorkers: 1,
  "transformIgnorePatterns": [
    "/node_modules/(?!(nanoid)/)"
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)