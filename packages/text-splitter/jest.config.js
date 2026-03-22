module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        types: ['jest'],
      },
    }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@all-platform-post/shared$': '<rootDir>/../../shared/src/index.ts',
  },
};
