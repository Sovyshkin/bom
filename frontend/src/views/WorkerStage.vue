<!-- eslint-disable -->
<template>
  <div class="worker-stage-page">
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>

    <div v-else-if="error" class="error">
      <h2>Ошибка</h2>
      <p>{{ error }}</p>
      <button @click="$router.go(-1)" class="btn-back">Назад</button>
    </div>

    <div v-else class="stage-content">
      <!-- Информация о проекте и элементе -->
      <div class="project-info">
        <h1>{{ project?.name || 'Проект' }}</h1>
        <h2>{{ element?.title }} {{ element?.brand }}</h2>
        
        <div class="stage-info">
          <h3 v-if="isSubStage">
            {{ parentStageName }} → {{ stage?.name }}
          </h3>
          <h3 v-else>
            {{ stage?.name }}
          </h3>
        </div>
      </div>

      <!-- Информация о статусе -->
      <div class="status-section">
        <div class="current-status">
          <span class="status-label">Текущий статус:</span>
          <span :class="['status-badge', getStatusClass(stage?.status)]">
            {{ stage?.status || 'Не начат' }}
          </span>
        </div>

        <!-- Информация о текущем исполнителе -->
        <div v-if="stage?.who && stage?.status === 'В работе'" class="worker-info">
          <p><strong>Исполнитель:</strong> {{ stage.who }}</p>
          <p><strong>Начато:</strong> {{ formatDate(stage.start) }}</p>
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="actions">
        <button 
          v-if="canStartWork"
          @click="startWork"
          :disabled="isUpdating"
          class="btn-start"
        >
          <span v-if="isUpdating">Обновление...</span>
          <span v-else>🚀 Приступить к работе</span>
        </button>

        <button 
          v-if="canFinishWork"
          @click="finishWork"
          :disabled="isUpdating"
          class="btn-finish"
        >
          <span v-if="isUpdating">Обновление...</span>
          <span v-else">✅ Готово</span>
        </button>

        <div v-if="!canStartWork && !canFinishWork && stage?.status === 'В работе'" class="info-message">
          <p>Этап выполняется другим сотрудником</p>
          <p><strong>{{ stage.who }}</strong> начал {{ formatDate(stage.start) }}</p>
        </div>

        <div v-if="stage?.status === 'Готов'" class="success-message">
          <p>✅ Этап завершен</p>
          <p><strong>{{ stage.who }}</strong></p>
          <p>Начато: {{ formatDate(stage.start) }}</p>
          <p>Завершено: {{ formatDate(stage.finish) }}</p>
        </div>
      </div>

      <!-- Детали элемента -->
      <div class="element-details">
        <h4>Детали элемента</h4>
        <div class="details-grid">
          <div v-if="element?.orderNumber">
            <span class="detail-label">Номер заказа:</span>
            <span>{{ element.orderNumber }}</span>
          </div>
          <div v-if="element?.quantity">
            <span class="detail-label">Количество:</span>
            <span>{{ element.quantity }}</span>
          </div>
          <div v-if="element?.material">
            <span class="detail-label">Материал:</span>
            <span>{{ element.material }}</span>
          </div>
          <div v-if="element?.profile">
            <span class="detail-label">Профиль:</span>
            <span>{{ element.profile }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main.ts'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const isLoading = ref(true)
const isUpdating = ref(false)
const error = ref('')

const project = ref(null)
const element = ref(null)
const stage = ref(null)
const subStage = ref(null)
const parentStageName = ref('')

const isSubStage = computed(() => !!route.query.subStageId)

const canStartWork = computed(() => {
  return stage.value?.status === 'Не начат' || stage.value?.status === 'Нет'
})

const canFinishWork = computed(() => {
  return stage.value?.status === 'В работе' && 
         stage.value?.who === mainStore.user?.username
})

const getStatusClass = (status) => {
  if (!status) return 'not-started'
  
  switch (status.toLowerCase()) {
    case 'не начат':
    case 'нет':
      return 'not-started'
    case 'в работе':
      return 'in-progress'
    case 'готов':
      return 'completed'
    default:
      return 'unknown'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const startWork = async () => {
  try {
    isUpdating.value = true
    
    const updateData = {
      status: 'В работе',
      userId: mainStore.user?.id
    }

    let updateUrl
    if (isSubStage.value) {
      updateUrl = `/api/etap-zagotovki/${subStage.value.id}/status`
    } else {
      updateUrl = `/api/etaps/${stage.value.id}/status`
    }

    const response = await axios.put(updateUrl, updateData)
    
    // Обновляем локальные данные из ответа сервера
    if (isSubStage.value) {
      subStage.value = response.data.subStage
    } else {
      stage.value = response.data.stage
    }

    // Показываем уведомление
    alert('Работа начата!')
    
  } catch (err) {
    console.error('Error starting work:', err)
    alert('Ошибка при начале работы: ' + (err.response?.data?.message || err.message))
  } finally {
    isUpdating.value = false
  }
}

const finishWork = async () => {
  try {
    isUpdating.value = true
    
    const updateData = {
      status: 'Готов',
      userId: mainStore.user?.id
    }

    let updateUrl
    if (isSubStage.value) {
      updateUrl = `/api/etap-zagotovki/${subStage.value.id}/status`
    } else {
      updateUrl = `/api/etaps/${stage.value.id}/status`
    }

    const response = await axios.put(updateUrl, updateData)
    
    // Обновляем локальные данные из ответа сервера
    if (isSubStage.value) {
      subStage.value = response.data.subStage
    } else {
      stage.value = response.data.stage
    }

    // Показываем уведомление
    alert('Работа завершена!')
    
  } catch (err) {
    console.error('Error finishing work:', err)
    alert('Ошибка при завершении работы: ' + (err.response?.data?.message || err.message))
  } finally {
    isUpdating.value = false
  }
}

const loadData = async () => {
  try {
    isLoading.value = true
    error.value = ''

    const { projectId, elementId, stageId, subStageId } = route.query

    if (!projectId || !elementId || !stageId) {
      throw new Error('Недостаточно параметров в URL')
    }

    // Загружаем проект
    const projectResponse = await axios.get(`/api/proekt/${projectId}`)
    project.value = projectResponse.data.project

    // Загружаем элемент
    const elementResponse = await axios.get(`/api/elements/${elementId}`)
    element.value = elementResponse.data.data

    if (subStageId) {
      // Загружаем подэтап
      const subStageResponse = await axios.get(`/api/etap-zagotovki/${subStageId}`)
      subStage.value = subStageResponse.data.subStage
      stage.value = subStage.value

      // Загружаем родительский этап для названия
      const parentStageResponse = await axios.get(`/api/etaps/${stageId}`)
      parentStageName.value = parentStageResponse.data.stage.name
    } else {
      // Загружаем основной этап
      const stageResponse = await axios.get(`/api/etaps/${stageId}`)
      stage.value = stageResponse.data.stage
    }

  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message || 'Ошибка загрузки данных'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  // Проверяем авторизацию
  if (!mainStore.isAuthenticated) {
    // Сохраняем текущий URL для возврата после авторизации
    const returnUrl = route.fullPath
    localStorage.setItem('returnUrl', returnUrl)
    
    // Перенаправляем на страницу авторизации
    router.push('/login')
    return
  }

  await loadData()
})
</script>

<style scoped>
.worker-stage-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1233ea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  color: #dc3545;
  padding: 40px 20px;
}

.error h2 {
  margin-bottom: 16px;
}

.btn-back {
  padding: 12px 24px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

.stage-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-info {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.project-info h1 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.project-info h2 {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 20px;
  font-weight: normal;
}

.stage-info h3 {
  margin: 0;
  color: #1233ea;
  font-size: 18px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 2px solid #1233ea;
}

.status-section {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.current-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.status-label {
  font-weight: 500;
  color: #333;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.not-started {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.status-badge.in-progress {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-badge.completed {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.worker-info {
  padding: 12px;
  background: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.worker-info p {
  margin: 4px 0;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.btn-start,
.btn-finish {
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 60px;
}

.btn-start {
  background: #28a745;
  color: white;
}

.btn-start:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
}

.btn-finish {
  background: #1233ea;
  color: white;
}

.btn-finish:hover:not(:disabled) {
  background: #0f2ac5;
  transform: translateY(-2px);
}

.btn-start:disabled,
.btn-finish:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.info-message,
.success-message {
  text-align: center;
  padding: 20px;
  border-radius: 12px;
}

.info-message {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.success-message p {
  margin: 4px 0;
}

.element-details {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.element-details h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.details-grid {
  display: grid;
  gap: 12px;
}

.details-grid > div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.detail-label {
  font-weight: 500;
  color: #666;
}

@media (max-width: 768px) {
  .worker-stage-page {
    padding: 16px;
  }
  
  .current-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>