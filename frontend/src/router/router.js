import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("@/views/auth/LoginPage.vue"),
      name: "login",
    },
    {
      path: "/email-verify",
      component: () => import("@/views/auth/EmailVerify.vue"),
      name: "email_verify",
    },
    {
      path: "/proekts",
      component: () => import("@/views/ProjectsPage.vue"),
      name: "proekts",
      meta: { requiresAuth: true }
    },
    {
      path: "/details",
      component: () => import("@/views/DetailsPage.vue"),
      name: "details",
      meta: { requiresAuth: true }
    },
    {
      path: "/details/more",
      component: () => import("@/views/OrderDetails.vue"),
      name: "order_details",
      meta: { requiresAuth: true }
    },
    {
      path: "/stages",
      component: () => import("@/views/StagesPage.vue"),
      name: "stages",
      meta: { requiresAuth: true }
    },
    {
      path: "/stages/blank",
      component: () => import("@/views/BlankStages.vue"),
      name: "blank_stages",
      meta: { requiresAuth: true }
    },
    {
      path: "/worker/stage",
      component: () => import("@/views/WorkerStage.vue"),
      name: "worker_stage",
      meta: { requiresAuth: true }
    },
    {
      path: "/qr/:proektId/:elementId/:stageId",
      component: () => import("@/views/WorkerStage.vue"),
      name: "qr_stage",
      meta: { requiresAuth: true }
    },
    {
      path: "/qr-generator",
      component: () => import("@/views/QRGenerator.vue"),
      name: "qr_generator",
      meta: { requiresAuth: true }
    },
  ],
});

// Auth guard для проверки авторизации
router.beforeEach(async (to, from, next) => {
  // Импортируем store только когда нужно
  const { useMainStore } = await import('@/stores/main.ts');
  const mainStore = useMainStore();
  
  console.log('Router beforeEach:', { 
    toName: to.name, 
    fromName: from.name, 
    isAuthenticated: mainStore.isAuthenticated 
  });
  
  // Список публичных маршрутов
  const publicRoutes = ['login', 'email_verify'];
  
  // Если это публичный маршрут
  if (publicRoutes.includes(to.name)) {
    // Если пользователь авторизован и пытается зайти на login, перенаправляем
    if (to.name === 'login' && mainStore.isAuthenticated) {
      // Проверяем, есть ли сохраненный URL для возврата
      const returnUrl = localStorage.getItem('returnUrl');
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        next(returnUrl);
        return;
      }
      // Иначе идем на главную страницу
      next({ name: 'proekts' });
      return;
    }
    next();
    return;
  }
  
  // Для защищенных маршрутов проверяем авторизацию
  const jwt = localStorage.getItem('jwt');
  const user = localStorage.getItem('user');
  
  if (!jwt || !user) {
    // Сохраняем URL для возврата после логина
    localStorage.setItem('returnUrl', to.fullPath);
    next({ name: 'login' });
    return;
  }
  
  // Восстанавливаем состояние авторизации если нужно
  if (!mainStore.isAuthenticated) {
    mainStore.jwt = jwt;
    mainStore.user = JSON.parse(user);
    mainStore.isAuthenticated = true;
    
    // Устанавливаем токен в axios
    const axios = await import('axios');
    axios.default.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
  }
  
  // Проверяем срок действия токена и пытаемся обновить его
  const tokenExpiration = localStorage.getItem('tokenExpiration');
  if (tokenExpiration && new Date().getTime() > parseInt(tokenExpiration)) {
    console.log('Token expired, trying to refresh...');
    
    const refreshed = await mainStore.refreshAccessToken();
    if (!refreshed) {
      console.log('Token refresh failed, redirecting to login');
      localStorage.setItem('returnUrl', to.fullPath);
      next({ name: 'login' });
      return;
    }
    console.log('Token refreshed successfully');
  }
  
  next();
});

export default router;
