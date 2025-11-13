module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // ОБЯЗАТЕЛЬНО генерируем пароль, если не указан
    if (!data.password) {
      const generateRandomPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      
      data.password = generateRandomPassword();
      console.log(`🔑 Сгенерирован пароль для пользователя: ${data.password}`);
    }
    
    // ОБЯЗАТЕЛЬНО генерируем email, если не указан
    if (!data.email) {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      data.email = `user_${timestamp}_${randomString}@example.com`;
      console.log(`📧 Сгенерирован email: ${data.email}`);
    }
    
    // ОБЯЗАТЕЛЬНО генерируем username, если не указан
    if (!data.username) {
      let username;
      
      if (data.email) {
        // Создаем username из email
        username = data.email.split('@')[0];
        username = username.replace(/[^a-zA-Z0-9]/g, '_');
      } else {
        // Генерируем случайный username
        username = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
      
      // Проверяем уникальность username
      let counter = 1;
      let originalUsername = username;
      
      while (true) {
        const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { username }
        });
        
        if (!existingUser) {
          break;
        }
        
        username = `${originalUsername}_${counter}`;
        counter++;
      }
      
      data.username = username;
      console.log(`👤 Сгенерирован username: ${data.username}`);
    }
    
    // Устанавливаем роль "authenticated" по умолчанию
    if (!data.role) {
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });
      
      if (authRole) {
        data.role = authRole.id;
        console.log(`👤 Назначена роль "authenticated" пользователю`);
      }
    }
    
    // Устанавливаем значения по умолчанию для системных полей
    if (data.confirmed === undefined) {
      data.confirmed = true; // По умолчанию пользователь подтвержден
    }
    
    if (data.blocked === undefined) {
      data.blocked = false; // По умолчанию пользователь не заблокирован
    }
    
    if (data.provider === undefined) {
      data.provider = 'local'; // По умолчанию локальный провайдер
    }
    
    console.log(`✅ Создается пользователь с данными:`, {
      username: data.username,
      email: data.email || 'не указан',
      name: data.name || 'не указано',
      surname: data.surname || 'не указано',
      hasPassword: !!data.password,
      confirmed: data.confirmed,
      blocked: data.blocked
    });
  },
  
  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Если изменяется email и username не установлен вручную, обновляем username
    if (data.email && !data.username) {
      let username = data.email.split('@')[0];
      username = username.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Проверяем уникальность username (исключая текущего пользователя)
      let counter = 1;
      let originalUsername = username;
      
      while (true) {
        const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { 
            username,
            id: { $ne: event.params.where.id }
          }
        });
        
        if (!existingUser) {
          break;
        }
        
        username = `${originalUsername}_${counter}`;
        counter++;
      }
      
      data.username = username;
    }
  }
};