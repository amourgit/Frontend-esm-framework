const { default: extendConfig, ...rest } = require('@egen/rspack-config');

module.exports = Object.assign(extendConfig, rest);
