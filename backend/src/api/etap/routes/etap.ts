/**
 * etap router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/element/:id/stages',
      handler: 'etap.getElementStages',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/etaps/:id',
      handler: 'etap.getStageById',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/etaps/:id/status',
      handler: 'etap.updateStageStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
