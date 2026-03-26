module.exports = function (api) {
  const isTest = api.cache.using(() => process.env.NODE_ENV === 'test')
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      ...(isTest ? [] : ['nativewind/babel']),
    ],
  }
}
