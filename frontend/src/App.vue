<script setup>
import AppHeader from "./components/AppHeader.vue";
import AppLoader from './components/AppLoader.vue'
import AppNotifications from './components/AppNotifications.vue'
import { useMainStore } from "./stores/main.ts";
import { useRouter, useRoute } from "vue-router";
import { onMounted } from "vue";

const mainStore = useMainStore();
const route = useRoute()
const router = useRouter();

// Инициализируем авторизацию при запуске приложения
console.log('Initializing app, calling initializeAuth...');
mainStore.initializeAuth();

onMounted(() => {
  console.log('App mounted, user:', mainStore.user);
  console.log('App mounted, isAuthenticated:', mainStore.isAuthenticated);
  console.log('App mounted, current route:', route.name);
});

router.beforeEach(async (to, from, next) => {
  console.log('Router beforeEach triggered:', { 
    toName: to.name, 
    fromName: from.name, 
    isAuthenticated: mainStore.isAuthenticated 
  });
  
  mainStore.isLoading = true;
  
  // Список маршрутов, которые не требуют авторизации
  const publicRoutes = ['login', 'email_verify'];
  
  // Если маршрут не требует авторизации, пропускаем
  if (publicRoutes.includes(to.name)) {
    console.log('Public route, allowing access');
    // Если пользователь авторизован и пытается зайти на login, редиректим на главную
    if (to.name === 'login' && mainStore.isAuthenticated) {
      console.log('Authenticated user trying to access login, redirecting to proekts');
      next({ name: 'proekts' });
      return;
    }
    next();
  } else {
    // Проверяем авторизацию для защищенных маршрутов
    if (!mainStore.isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      next({ name: 'login' });
    } else {
      // Проверяем валидность токена
      if (!mainStore.isTokenValid()) {
        console.log('Token invalid, trying to refresh');
        const refreshed = await mainStore.refreshAccessToken();
        if (!refreshed) {
          console.log('Token refresh failed, redirecting to login');
          next({ name: 'login' });
          return;
        }
        console.log('Token refreshed successfully');
      }
      console.log('User authenticated, allowing access');
      next();
    }
  }

  setTimeout(() => {
    mainStore.isLoading = false;
  }, 500);
});
</script>
<template>
  <AppHeader v-if="route.name != 'login' && route.name !='email_verify'"/>
  <main>
    <div class="wrap-loader" v-if="mainStore.isLoading">
      <AppLoader />
    </div>
    <router-view v-else v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  
  <!-- Компонент уведомлений -->
  <AppNotifications />
</template>
<style>
@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

html, body {
  scroll-behavior: smooth;
  overflow-x: hidden; /* Только горизонтальная прокрутка отключена */
}

#app {
  font-family: "Inter", sans-serif;
  width: 100%;
  min-height: 100vh; /* Обеспечиваем минимальную высоту */
}
* {
  padding: 0px;
  margin: 0px;
  border: none;
  font-weight: 400;
  font-size: 16px;
  line-height: 21px;
  font-style: normal;
  font-family: "Inter", sans-serif;
  color: #16171B;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.wrap {
  display: flex;
  justify-content: space-evenly;
  padding: 40px;
  width: 100%;
}

body,
#app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Links */

a,
a:link,
a:visited {
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

/* Common */

aside,
nav,
footer,
header,
section,
main {
  display: block;
}

ul,
ul li {
  list-style: none;
}

img {
  vertical-align: top;
}

img,
svg {
  max-width: 100%;
  height: auto;
}

address {
  font-style: normal;
}

/* Form */

input,
textarea,
button,
select {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background-color: transparent;
}

input::-ms-clear {
  display: none;
}

button,
input[type="submit"] {
  display: inline-block;
  box-shadow: none;
  background-color: transparent;
  background: none;
  cursor: pointer;
}

input:focus,
input:active,
button:focus,
button:active {
  outline: none;
  box-shadow: none;
}

button::-moz-focus-inner {
  padding: 0;
  border: 0;
}

.card {
  transition: all 500ms ease;
  cursor: pointer;
}

.wrap-loader {
  width: 100%;
  height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrap {
  max-width: 1440px;
  margin: 0 auto;
}

h1 {
  font-weight: 500;
  font-size: 24px;
  color: #16171B;
}

.group-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-item {
  font-size: 14px;
  line-height: 16px;
}

.group-value {
  background-color: #F8F9FC;
  border: 1px solid #F1F2F4;
  padding: 12px 16px;
  border-radius: 8px;
}

.group-value::placeholder {
  font-weight: 300;
  color: #8C93A6;
  font-size: 14px;
  line-height: 22px;
}
</style>
