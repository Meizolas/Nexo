const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  collectCoverageFrom: undefined,
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
};
