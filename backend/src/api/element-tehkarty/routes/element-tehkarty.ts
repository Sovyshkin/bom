'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/element-tehkarties/createTechCardsFromExcel',
      handler: 'element-tehkarty.createTechCardsFromExcel',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/element-tehkarties/getByProject/:projectId',
      handler: 'element-tehkarty.getTechCardsByProject',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/element-tehkarties/getByElement/:elementId',
      handler: 'element-tehkarty.getTechCardsByElement',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/element-tehkarties/deleteByProject/:projectId',
      handler: 'element-tehkarty.deleteTechCardsByProject',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ],
};