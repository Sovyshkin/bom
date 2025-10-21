<script setup>
import LogInButton from "@/components/ui/buttons/LogInButton.vue";
import { useMainStore } from "@/stores/main.ts";

const mainStore = useMainStore();

</script>
<template>
  <div class="wrap">
    <h1>Авторизация</h1>
    <div class="warn" v-if="mainStore.userNotFound">
      <img src="@/assets/danger.svg" alt="" />
      <p>Такого пользователя не существует</p>
    </div>
    <div class="group-input">
      <label class="group-item" for="#email">Почта</label>
      <input
        class="group-value"
        type="email"
        id="email"
        placeholder="Введите почту"
        v-model="mainStore.email"
        @keyup.enter="mainStore.logIn"
      />
    </div>
    <LogInButton @click="mainStore.logIn" />
  </div>
</template>
<style scoped>
.wrap {
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  height: 100vh;
  gap: 24px;
  min-width: 360px;
  max-width: 450px;
  padding: 0 20px;
}

.group-input {
  width: 100%;
}

.warn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #df3a44;
  background-color: rgba(223, 58, 68, 0.1);
}

.warn p {
  color: #df3a44;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 480px) {
  .wrap {
    min-width: 100%;
    max-width: 100%;
    padding: 0 16px;
    gap: 20px;
  }
  
  h1 {
    font-size: 24px;
  }
}
</style>
