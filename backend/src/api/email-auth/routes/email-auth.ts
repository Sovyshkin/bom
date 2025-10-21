'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/email-auth/send-code',
      handler: 'email-auth.sendCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/email-auth/verify-code',
      handler: 'email-auth.verifyCode',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/refresh',
      handler: 'email-auth.refreshToken',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};