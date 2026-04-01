const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    "react-native-css-interop/jsx-runtime": path.resolve(
      __dirname,
      "node_modules/react-native-css-interop/dist/runtime/jsx-runtime.js",
    ),
    "react-native-css-interop/jsx-dev-runtime": path.resolve(
      __dirname,
      "node_modules/react-native-css-interop/dist/runtime/jsx-dev-runtime.js",
    ),
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
