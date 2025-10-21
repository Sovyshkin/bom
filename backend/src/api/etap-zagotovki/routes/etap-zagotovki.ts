/**
 * etap-zagotovki router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/stage/:id/substages',
      handler: 'etap-zagotovki.findByStageId',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/etap-zagotovki/:id',
      handler: 'etap-zagotovki.getSubStageById',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/etap-zagotovki/:id/status',
      handler: 'etap-zagotovki.updateSubStageStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
