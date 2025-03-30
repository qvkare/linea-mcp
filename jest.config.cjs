module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**/*.ts'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
}; 