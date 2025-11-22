// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Bắt buộc phải có dòng này để reanimated hoạt động
      'react-native-reanimated/plugin',
    ],
  };
};