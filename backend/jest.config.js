module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'models/**/*.js',
    'utils/**/*.js',
    'routes/**/*.js',
    '!models/ticketIndex.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  setupFiles: ['./tests/setupEnv.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
};
