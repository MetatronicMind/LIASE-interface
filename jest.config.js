export default {
  rootDir: './src',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  testEnvironment: 'node',
  transform: {},
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: '../coverage', // Ensure coverage is generated outside of src
  coverageReporters: ['cobertura', 'lcov', 'text-summary'], // Add 'cobertura' for SonarQube
};
