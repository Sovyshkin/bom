export default {
  routes: [
    {
      method: "GET",
      path: "/element/:id/stages",
      handler: "etap.getElementStages",
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/stage/:id',
      handler: 'etap.getStageById',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
