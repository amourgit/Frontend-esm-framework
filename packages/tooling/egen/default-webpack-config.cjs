const { default: extendConfig, ...rest } = require('@egen-civitas/webpack-config');

module.exports = Object.assign(extendConfig, rest);
