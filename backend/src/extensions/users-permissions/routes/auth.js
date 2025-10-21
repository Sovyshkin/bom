'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/send-code',
      handler: 'auth.sendCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/verify-code',
      handler: 'auth.verifyCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};