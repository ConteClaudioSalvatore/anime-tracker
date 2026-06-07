const { getDefaultConfig } = require("expo/metro-config");

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

/**
 * @type {ReturnType<typeof getDefaultConfig>}
 */
module.exports = {
  ...config,
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve("./metro-transformer.cjs"),
  },
};
