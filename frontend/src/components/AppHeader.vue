<script setup>
import { onMounted, computed } from 'vue'
import { useCookies } from 'vue3-cookies'
import { useMainStore } from '@/stores/main.ts'
import GlobalSearch from './GlobalSearch.vue'

const { cookies } = useCookies()
const mainStore = useMainStore()

const handleLogout = () => {
  mainStore.logout()
}

// Вычисляемое свойство для отображения данных пользователя
const displayUser = computed(() => {
  // Добавляем проверки на существование и тип
  if (mainStore.user && 
      typeof mainStore.user === 'object' && 
      mainStore.user !== null &&
      (mainStore.user.name || mainStore.user.surname)) {
    return {
      name: mainStore.user.name || '',
      surname: mainStore.user.surname || '',
      email: mainStore.user.email || ''
    }
  }
  
  // Если в store нет данных, проверяем куки (fallback)
  try {
    const userData = cookies.get('user')
    if (userData) {
      const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData
      if (parsedUser && typeof parsedUser === 'object') {
        return {
          name: parsedUser.name || '',
          surname: parsedUser.surname || '',
          email: parsedUser.email || ''
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при парсинге данных пользователя:', error)
  }
  
  return { name: '', surname: '', email: '' }
})

onMounted(() => {
  console.log('AppHeader mounted, user:', mainStore.user)
})
</script>

<template>
  <header>
    <div class="wrap-logo" @click="$router.push({ name: 'proekts' })">
      Металл трекер
    </div>
    <div class="wrap-search">
      <GlobalSearch />
    </div>
    <div class="user-section">
      <span class="user" v-if="displayUser && displayUser.name && displayUser.surname">
        {{ displayUser.name }} {{ displayUser.surname }}
      </span>
      <span class="user" v-else-if="mainStore.isAuthenticated && displayUser && displayUser.email">
        {{ displayUser.email }}
      </span>
      <span class="user" v-else-if="mainStore.isAuthenticated">
        Пользователь
      </span>
      <span class="user" v-else>
        Гость
      </span>
      <button class="logout-btn" @click="handleLogout" title="Выйти" v-if="mainStore.isAuthenticated">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H3C2.45 2 2 2.45 2 3V13C2 13.55 2.45 14 3 14H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M11 11L14 8L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 16px 40px;
}

.wrap-logo {
  font-weight: 500;
  font-size: 24px;
  cursor: pointer;
}

.wrap-search {
  display: flex;
  align-items: center;
  position: relative;
  flex: 1;
  max-width: 400px;
}

.user {
  font-weight: 500;
  font-size: 16px;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #8C93A6;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  background-color: #F8F9FC;
  color: #1233EA;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn {
  background: none;
  border: none;
  color: #8C93A6;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background-color: #f5f5f5;
  color: #1233ea;
}

.wrap-search {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  background-color: #F8F9FC;
  border: 1px solid #F1F2F4;
  padding: 16px;
}

.wrap-search input {
  flex: 1;
}

label {
  cursor: pointer;
}

/* Адаптивность для планшетов */
@media (max-width: 768px) {
  header {
    gap: 24px;
    padding: 12px 20px;
  }
  
  .wrap-logo {
    font-size: 20px;
  }
  
  .user {
    font-size: 14px;
  }
  
  .user-section {
    gap: 8px;
  }
  
  .logout-btn {
    padding: 6px;
  }
  
  .wrap-search {
    padding: 12px;
  }
}

/* Адаптивность для мобильных */
@media (max-width: 480px) {
  header {
    gap: 16px;
    padding: 8px 16px;
  }
  
  .wrap-logo {
    font-size: 18px;
  }
  
  .user {
    font-size: 12px;
    white-space: nowrap;
  }
  
  .user-section {
    gap: 6px;
  }
  
  .logout-btn {
    padding: 4px;
  }
  
  .logout-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .wrap-search {
    display: none;
  }
}
</style>