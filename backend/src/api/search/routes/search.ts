module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/search',
      handler: 'search.globalSearch',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ],
};