<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from 'vue-router'
import BackButton from "@/components/BackButton.vue";
import { useMainStore } from '@/stores/main.ts'

const router = useRouter()
const route = useRoute()

const mainStore = useMainStore()

const statusFilter = ref("all");
const searchQuery = ref("");
const isLoading = ref(false);

// const statusOptions = [
//   { value: "all", label: "Все статусы" },
//   { value: "В работе", label: "В работе" },
//   { value: "Готово", label: "Готово" },
//   { value: "Не начат", label: "Не начат" },
// ];

// Функция для безопасного получения класса статуса
const getStatusClass = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace(' ', '-');
};

// Функция для форматирования даты и времени
const formatDate = (dateString) => {
  if (!dateString || dateString === '-- -- ----') return '-- -- ----'
  
  try {
    const date = new Date(dateString)
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) return '-- -- ----'
    
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return '-- -- ----'
  }
};

const filteredStages = computed(() => {
  let filtered = mainStore.stages || [];

  // Фильтрация по статусу
  if (statusFilter.value !== "all") {
    filtered = filtered.filter((stage) => (stage.status || stage.status_work) === statusFilter.value);
  }

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (stage) =>
        stage.name?.toLowerCase().includes(query) ||
        stage.who?.toLowerCase().includes(query) ||
        (stage.status || stage.status_work)?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const viewStageDetails = (stageId, stageName) => {
  console.log(stageId, stageName);
  
  if (stageName == 'Заготовка') {
    router.push({ name: 'blank_stages', query: { id: stageId } });
  }
};

const showOrderDetails = () => {
  router.push({ name: "order_details", query: { proektId: mainStore.proektSelected.id, elementId: mainStore.elementSelected.id } })
};

// Загрузка данных при монтировании
const loadData = async () => {
  try {
    isLoading.value = true;
    const elementId = route.query.id;
    await mainStore.getElement(elementId);
    await mainStore.getStages();
  } catch (err) {
    console.error('Error loading stages:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="stages-page">
    <BackButton />
    
    <div class="header-actions">
      <div class="header-info">
        <h1>{{ mainStore.elementSelected?.title || 'Загрузка...' }}</h1>
        <span class="subtitle">{{ mainStore.elementSelected?.brand || 'Без марки' }}</span>
      </div>
      
      <div class="right-actions">
        <button class="btn details" @click="showOrderDetails">Подробности заказа</button>
      </div>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="loading">
      Загрузка этапов...
    </div>

    <!-- Сообщение если нет этапов -->
    <div v-else-if="filteredStages.length === 0" class="no-stages">
      Этапы не найдены
    </div>

    <!-- Desktop и Mobile View когда есть этапы -->
    <template v-else>
      <!-- Desktop View with Blocks -->
      <div class="stages-container desktop-view">
        <div class="stages-header">
          <div class="header-cell">Название</div>
          <div class="header-cell">Исполнитель</div>
          <div class="header-cell">Этап</div>
          <div class="header-cell">Взял в работу</div>
          <div class="header-cell">Закончил</div>
          <div class="header-cell">Статус</div>
          <div class="header-cell"></div>
        </div>

        <div 
          v-for="stage in filteredStages" 
          :key="stage.id" 
          class="stage-row"
          @click="viewStageDetails(stage.id, stage.name)"
        >
          <div class="stage-cell name-cell">{{ stage.name || 'Без названия' }}</div>
          <div class="stage-cell executor-cell">{{ stage.who || 'Не назначен' }}</div>
          <div class="stage-cell stage-name-cell">
            <span v-if="stage.name === 'Заготовка'">{{ stage.status || stage.status_work || 'Не начат' }}</span>
            <span v-else>—</span>
          </div>
          <div class="stage-cell start-cell">{{ formatDate(stage.startedAt || stage.start) }}</div>
          <div class="stage-cell finish-cell">{{ formatDate(stage.finishedAt || stage.finish) }}</div>
          <div class="stage-cell status-cell">
            <span
              :class="[
                'status-badge',
                getStatusClass(stage.status || stage.status_work),
              ]"
            >
              {{ stage.status || stage.status_work || 'Не начат' }}
            </span>
          </div>
          <div class="stage-cell arrow-cell">
            <svg
              v-if="stage.name === 'Заготовка'"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 12L10 8L6 4"
                stroke="#8C93A6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="stages-cards mobile-view">
        <div 
          v-for="stage in filteredStages" 
          :key="stage.id" 
          class="stage-card"
          @click="viewStageDetails(stage.id, stage.name)"
        >
          <div class="card-header">
            <h3>{{ stage.name || 'Без названия' }}</h3>
            <span
              :class="[
                'status-badge',
                getStatusClass(stage.status || stage.status_work),
              ]"
            >
              {{ stage.status || stage.status_work || 'Не начат' }}
            </span>
          </div>

          <div class="card-content">
            <p class="stage-executor">Исполнитель: {{ stage.who || 'Не назначен' }}</p>
            <p v-if="stage.name === 'Заготовка'" class="stage-stage">Статус: {{ stage.status || stage.status_work || 'Не начат' }}</p>
            <p class="stage-start">Взял в работу: {{ formatDate(stage.startedAt || stage.start) }}</p>
            <p class="stage-finish">Закончил: {{ formatDate(stage.finishedAt || stage.finish) }}</p>

            <div class="card-actions">
              <button class="action-btn view-details-btn">
                Смотреть подробнее
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stages-page {
  padding: 20px 40px;
  padding-bottom: 60px; /* Добавляем отступ снизу для удобной прокрутки */
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

h1 {
  font-size: 24px;
  font-weight: 500;
  margin: 0;
}

.subtitle {
  color: #8C93A6;
  font-size: 14px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn.details {
  background-color: rgba(18, 51, 234, 0.1);
  border-radius: 8px;
  padding: 17.5px 24px;
  color: #1233EA;
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn.details:hover {
  background-color: #1233EA;
  color: #fff;
}

.filters-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.filter-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-btn {
  padding: 12px 16px;
  background-color: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #8c93a6;
  font-weight: 500;
  border: none;
  transition: all 0.3s ease;
}

.filter-btn.active,
.filter-btn:hover {
  background-color: #1233ea;
  color: white;
}

.search-box {
  width: 100%;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #8c93a6;
}

.no-stages {
  text-align: center;
  padding: 40px;
  color: #8c93a6;
  font-size: 16px;
}

/* Stages Container with Blocks */
.stages-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Убираем overflow: hidden чтобы разрешить прокрутку */
}

.stages-header {
  display: flex;
  padding: 20px;
}

.header-cell {
  flex: 1;
  color: #8c93a6;
  font-weight: 500;
  font-size: 14px;
}

.header-cell:last-child {
  flex: 0 0 50px;
}

.stage-row {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #f1f2f4;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.stage-row:hover {
  background-color: #f8f9fb;
}

.stage-cell {
  flex: 1;
  color: #000;
  font-size: 14px;
}

.arrow-cell {
  flex: 0 0 50px;
  display: flex;
  justify-content: flex-end;
}

/* Status Badges */
.status-badge {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: inline-block;
}

.status-badge.в-работе {
  background: rgba(239, 83, 7, 0.1);
  color: #ef5307;
}

.status-badge.готов,
.status-badge.готово {
  background: rgba(8, 184, 29, 0.1);
  color: #08b81d;
}

.status-badge.не-начат {
  background: rgba(140, 147, 166, 0.1);
  color: #8c93a6;
}

/* Mobile Cards */
.stages-cards {
  display: none;
}

.stage-card {
  cursor: pointer;
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f2f4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-right: 10px;
  margin-top: 0;
  margin-bottom: 0;
}

.stage-executor,
.stage-stage,
.stage-start,
.stage-finish {
  color: #666;
  margin-bottom: 8px;
  font-size: 14px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.view-details-btn {
  padding: 12px;
  background: #1233ea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .stages-page {
    padding: 20px;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-buttons {
    flex-wrap: wrap;
  }

  .search-box {
    max-width: none;
  }

  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: flex;
    flex-direction: column;
  }
}

@media (min-width: 769px) {
  .desktop-view {
    display: flex;
    flex-direction: column;
  }

  .mobile-view {
    display: none;
  }
}
</style>