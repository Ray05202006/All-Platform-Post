module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '../tsconfig.json',
    }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@all-platform-post/shared$': '<rootDir>/../../shared/src/index.ts',
  },
};
