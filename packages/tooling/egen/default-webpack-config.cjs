const { default: extendConfig, ...rest } = require('@egen/webpack-config');

module.exports = Object.assign(extendConfig, rest);
