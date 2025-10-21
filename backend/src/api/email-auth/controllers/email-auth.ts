'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Генерация простого 4-значного кода
const generateSimpleCode = () => {
  const patterns = [
    () => {
      const first = Math.floor(Math.random() * 9) + 1;
      const second = Math.floor(Math.random() * 9) + 1;
      return `${first}${first}${second}${second}`;
    },
    () => {
      const first = Math.floor(Math.random() * 9) + 1;
      const second = Math.floor(Math.random() * 9) + 1;
      return `${first}${second}${second}${first}`;
    },
    () => {
      const start = Math.floor(Math.random() * 6) + 1;
      return `${start}${start + 1}${start + 2}${start + 3}`;
    },
    () => {
      const pair1 = Math.floor(Math.random() * 9) + 1;
      let pair2 = Math.floor(Math.random() * 9) + 1;
      while (pair2 === pair1) {
        pair2 = Math.floor(Math.random() * 9) + 1;
      }
      return `${pair1}${pair1}${pair2}${pair2}`;
    }
  ];

  return patterns[Math.floor(Math.random() * patterns.length)]();
};

module.exports = {
  async sendCode(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ctx.badRequest('Invalid email format');
    }

    try {
      let user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      // Проверяем, существует ли пользователь с таким email
      if (!user) {
        // Возвращаем статус, что пользователь не найден
        return ctx.send({ 
          success: false,
          userExists: false,
          message: 'User with this email does not exist'
        });
      }

      const verificationCode = generateSimpleCode();
      const codeExpires = new Date(Date.now() + 10 * 60 * 1000);

      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          verificationCode: await bcrypt.hash(verificationCode, 10),
          codeExpires
        }
      });

      console.log('📧 Verification code for', email, ':', verificationCode);

      // Отправка email через Beget SMTP
      try {
        await strapi.plugins['email'].services.email.send({
          to: email,
          from: process.env.SMTP_FROM_EMAIL,
          subject: 'Ваш код подтверждения',
          text: `Ваш код подтверждения: ${verificationCode}. Код действителен 10 минут.`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.6; 
                        color: #333; 
                        max-width: 600px; 
                        margin: 0 auto; 
                        padding: 20px; 
                    }
                    .header { 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 30px; 
                        text-align: center; 
                        border-radius: 10px 10px 0 0; 
                    }
                    .content { 
                        background: #f9f9f9; 
                        padding: 30px; 
                        border-radius: 0 0 10px 10px; 
                        border: 1px solid #ddd;
                    }
                    .code { 
                        background: #fff; 
                        padding: 20px; 
                        font-size: 32px; 
                        font-weight: bold; 
                        text-align: center; 
                        margin: 20px 0; 
                        border-radius: 8px; 
                        border: 2px dashed #667eea; 
                        letter-spacing: 8px;
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 30px; 
                        font-size: 12px; 
                        color: #666; 
                    }
                    .warning { 
                        background: #fff3cd; 
                        border: 1px solid #ffeaa7; 
                        padding: 15px; 
                        border-radius: 5px; 
                        margin: 20px 0; 
                        color: #856404;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Код подтверждения</h1>
                </div>
                <div class="content">
                    <p>Здравствуйте!</p>
                    <p>Для завершения авторизации используйте следующий код подтверждения:</p>
                    
                    <div class="code">${verificationCode}</div>
                    
                    <div class="warning">
                        ⚠️ <strong>Код действителен в течение 10 минут</strong><br>
                        Не передавайте код третьим лицам
                    </div>
                    
                    <p>Если вы не запрашивали этот код, пожалуйста, проигнорируйте это письмо.</p>
                </div>
                <div class="footer">
                    <p>© 2025 BOM. Все права защищены.</p>
                </div>
            </body>
            </html>
          `
        });
        
        console.log('✅ Email sent successfully to:', email);

      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
        // Не прерываем выполнение, но логируем ошибку
      }

      ctx.send({ 
        success: true,
        userExists: true,
        message: 'Verification code sent to email',
        ...(process.env.NODE_ENV === 'development' && { 
          expires_in: '10 minutes'
        })
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

    const codeRegex = /^\d{4}$/;
    if (!codeRegex.test(code)) {
      return ctx.badRequest('Code must be 4 digits');
    }

    try {
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return ctx.badRequest('User not found');
      }

      if (!user.codeExpires || new Date() > new Date(user.codeExpires)) {
        return ctx.badRequest('Verification code has expired');
      }

      if (!user.verificationCode) {
        return ctx.badRequest('No verification code found');
      }

      const isValid = await bcrypt.compare(code, user.verificationCode);
      
      if (!isValid) {
        return ctx.badRequest('Invalid verification code');
      }

      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          verificationCode: null,
          codeExpires: null,
          isVerified: true
        }
      });

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      ctx.send({
        success: true,
        jwt: token,
        refreshToken: token, // Используем тот же токен как refresh (для простоты)
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname
        },
        message: 'Successfully authenticated'
      });

    } catch (error) {
      console.error('Verify code error:', error);
      ctx.internalServerError('Something went wrong');
    }
  },

  async refreshToken(ctx) {
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
      return ctx.badRequest('Refresh token is required');
    }

    try {
      // Проверяем refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret');
      
      // Проверяем, что пользователь существует
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: decoded.id }
      });

      if (!user) {
        return ctx.unauthorized('User not found');
      }

      // Генерируем новый токен
      const newToken = jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      ctx.send({
        success: true,
        jwt: newToken,
        refreshToken: newToken, // Используем тот же токен как refresh (для простоты)
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname
        },
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return ctx.unauthorized('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        return ctx.unauthorized('Invalid refresh token');
      }
      
      ctx.internalServerError('Something went wrong');
    }
  }
};