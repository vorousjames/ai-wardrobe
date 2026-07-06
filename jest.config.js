module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|@react-navigation|@react-native-async-storage|@react-native-community|expo(nent)?|@expo(nent)?/.*|react-native.*|@react-native/.*)/)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.expo/'],
};