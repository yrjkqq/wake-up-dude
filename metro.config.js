const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable loading WebAssembly files natively in the dev server for SQLite Web compatibility
config.resolver.assetExts.push('wasm');

module.exports = config;
