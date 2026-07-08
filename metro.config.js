const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add extra node modules resolution
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'whatwg-url-minimum': require.resolve('whatwg-url-minimum'),
  'use-latest-callback': require.resolve('use-latest-callback'),
};

module.exports = config;
