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
  ],
});

export default router;
