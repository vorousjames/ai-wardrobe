const { version } = require('./package.json');

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      buildCommit: process.env.EAS_BUILD_GIT_COMMIT_HASH || 'dev',
      buildTime: new Date().toISOString(),
    },
  };
};
