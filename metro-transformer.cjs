const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = ({ src, filename, ...rest }) => {
  if (filename.endsWith("_t.cjs"))
    return upstreamTransformer.transform({
      src: `let code = ${JSON.stringify(src)}; export default code;`,
      filename,
      ...rest,
    });
  return upstreamTransformer.transform({ src, filename, ...rest });
};
