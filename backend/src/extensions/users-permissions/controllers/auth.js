'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Генерация случайного кода
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = createCoreController('plugin::users-permissions.user', ({ strapi }) => ({
  async sendCode(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    try {
      // Проверяем существует ли пользователь
      let user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      // Если пользователь не существует, создаем его
      if (!user) {
        user = await strapi.query('plugin::users-permissions.user').create({
          data: {
            email: email.toLowerCase(),
            username: email.toLowerCase(),
            password: await bcrypt.hash(Math.random().toString(36), 10),
            confirmed: true,
            blocked: false
          }
        });
      }

      // Генерируем код
      const verificationCode = generateCode();
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

      // Сохраняем код в базе
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          verificationCode: await bcrypt.hash(verificationCode, 10),
          codeExpires
        }
      });

      // Отправляем email с кодом
      try {
        await strapi.plugins['email'].services.email.send({
          to: email,
          from: 'noreply@yourdomain.com',
          subject: 'Your verification code',
          text: `Your verification code is: ${verificationCode}. It will expire in 15 minutes.`,
          html: `
            <h2>Your verification code</h2>
            <p>Your verification code is: <strong>${verificationCode}</strong></p>
            <p>This code will expire in 15 minutes.</p>
          `
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // В development режиме выводим код в консоль
        if (process.env.NODE_ENV === 'development') {
          console.log('Verification code:', verificationCode);
        }
      }

      ctx.send({ 
        message: 'Verification code sent to email',
        // Для development показываем код
        ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
      });

    } catch (error) {
      console.error('Send code error:', error);
      ctx.internalServerError('Something went wrong');
    }
  },

  async verifyCode(ctx) {
    const { email, code } = ctx.request.body;

    if (!email || !code) {
      return ctx.badRequest('Email and code are required');
    }

    try {
      // Находим пользователя
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return ctx.badRequest('User not found');
      }

      // Проверяем срок действия кода
      if (user.codeExpires && new Date() > new Date(user.codeExpires)) {
        return ctx.badRequest('Verification code expired');
      }

      // Проверяем код
      const isValid = await bcrypt.compare(code, user.verificationCode);
      
      if (!isValid) {
        return ctx.badRequest('Invalid verification code');
      }

      // Очищаем код после успешной проверки
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          verificationCode: null,
          codeExpires: null,
          isVerified: true
        }
      });

      // Генерируем JWT токен
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      ctx.send({
        jwt: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });

    } catch (error) {
      console.error('Verify code error:', error);
      ctx.internalServerError('Something went wrong');
    }
  }
}));