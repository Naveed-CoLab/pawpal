// Metro configuration for Expo
// Adds support for bundling .lottie files as assets
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, 'lottie'];

module.exports = config;


