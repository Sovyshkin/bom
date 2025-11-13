<!-- eslint-disable -->
<template>
  <div class="order-details">
    <button class="back" @click="goToStages">
      <span>←</span>
      Назад к этапам
    </button>
    
    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Загрузка данных...</p>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="goToOrderDetails" class="back-btn">Вернуться к детали заказа</button>
    </div>

    <!-- Основной контент -->
    <template v-else>
      <h1>{{ project?.name || 'Проект' }}</h1>
      <div class="wrap-title">
        <h2>{{ element?.title || 'Элемент' }} {{ element?.dimensions }}</h2>
        <h3>{{ element?.constructionType || 'Тип конструкции не указан' }}</h3>
      </div>

      <div class="info">
        <div class="info-item">
          <span>The number is in order (No n/r):</span>
          <span>{{ project?.orderNumber || project?.id || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Title-Subtitle-СIА (Титул-Подтитул-СІА):</span>
          <span>{{ project?.title || project?.name || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Structure (Структура):</span>
          <span>{{ element?.structure || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Mark (Mapka):</span>
          <span>{{ element?.brand || element?.title || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>DWG N° (НоМер ueptexa):</span>
          <span>{{ element?.drawingNumber || project?.drawingNumber || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Sjheet No (Homep nucra):</span>
          <span>{{ element?.sheetNumber || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Description (Onucarne):</span>
          <span>{{ element?.description || element?.title || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Mark weight. kg (Веc марки.кг):</span>
          <span>{{ element?.weightNetSingle || element?.weight || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>QТY(кол-во, шт.):</span>
          <span>{{ element?.quantity || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Total Weight, kg (Вес ecero, kr,):</span>
          <span>{{ element?.weightNetTotal || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Anti-corrosion protection area per unit, m2 (площадь 1 детали):</span>
          <span>{{ element?.areaTotalSingle || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Anti-corosion protection area per unit. m3 (общ. Площадь):</span>
          <span>{{ element?.areaTotalTotal || 'Не указан' }}</span>
        </div>
        <div class="info-item">
          <span>Толщина покрытия:</span>
          <span>{{ element?.coatingThickness || 'Не указан' }}</span>
        </div>
      </div>

      <!-- Секция управления работой -->
      <div class="work-management-section">
        <h2>Управление работой</h2>
        <p class="work-description">
          Текущий этап: "{{ stage?.name }}" - {{ stage?.status || stage?.status_work || 'Не начат' }}
        </p>
        
        <!-- Информация о статусе -->
        <div class="status-section">
          <div class="current-status">
            <span class="status-label">Текущий статус:</span>
            <span :class="['status-badge', getStatusClass(stage?.status || stage?.status_work)]">
              {{ stage?.status || stage?.status_work || 'Не начат' }}
            </span>
          </div>

          <!-- Информация о текущем исполнителе -->
          <div v-if="(stage?.status || stage?.status_work) === 'В работе'" class="worker-info">
            <p><strong>Исполнитель:</strong> 
              {{ getWorkerName(stage.startedBy) || stage.who || 'Неизвестно' }}
            </p>
            <p><strong>Начато:</strong> 
              {{ formatDate(stage.startedAt || stage.start) }}
            </p>
          </div>
          
          <!-- Информация о завершении -->
          <div v-if="(stage?.status || stage?.status_work) === 'Готов'" class="completion-info">
            <p><strong>Завершено:</strong> 
              {{ formatDate(stage.finishedAt || stage.finish) }}
            </p>
            <p v-if="stage.finishedBy || stage.who">
              <strong>Завершил:</strong> 
              {{ getWorkerName(stage.finishedBy) || stage.who || 'Неизвестно' }}
            </p>
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="actions">
          <button 
            v-if="canStartWork"
            @click="startWork"
            :disabled="isUpdating"
            class="btn-action btn-start"
          >
            <div class="btn-content">
              <div class="btn-text">
                Приступить к работе
              </div>
            </div>
          </button>

          <div v-if="canFinishWork || canCancelWork" class="work-buttons">
            <button 
              v-if="canFinishWork"
              @click="finishWork"
              :disabled="isUpdating"
              class="btn-action btn-finish"
            >
              <div class="btn-content">
                <div class="btn-text">
                Завершить
                </div>
              </div>
            </button>

            <button 
              v-if="canCancelWork"
              @click="cancelWork"
              :disabled="isUpdating"
              class="btn-action btn-cancel"
            >
              <div class="btn-content">
                <div class="btn-text">
                  <span v-if="isUpdating">Обновление...</span>
                  <span v-else>Отменить</span>
                </div>
              </div>
            </button>
          </div>

          <div v-if="!canStartWork && !canFinishWork && stage?.status === 'В работе'" class="info-message">
            <p>Этап выполняется другим сотрудником</p>
            <p><strong>{{ getWorkerName(stage.startedBy) || stage.who || 'Неизвестно' }}</strong> начал {{ formatDate(stage.startedAt || stage.start) }}</p>
          </div>

          <div v-if="stage?.status === 'Готов'" class="success-message">
            <p>Этап завершен</p>
            <p><strong>{{ getWorkerName(stage.finishedBy) || getWorkerName(stage.startedBy) || stage.who || 'Неизвестно' }}</strong></p>
            <p>Начато: {{ formatDate(stage.startedAt || stage.start) }}</p>
            <p>Завершено: {{ formatDate(stage.finishedAt || stage.finish) }}</p>
          </div>
        </div>
      </div>
    </template>
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
  const status = stage.value?.status || stage.value?.status_work
  return status === 'Не начат' || status === 'Нет' || !status
})

const canFinishWork = computed(() => {
  const status = stage.value?.status || stage.value?.status_work
  if (status !== 'В работе') return false
  
  // Проверяем по новому полю startedBy или по старому полю who
  const currentUserId = mainStore.user?.id
  const currentUsername = mainStore.user?.username || mainStore.user?.email
  const currentUserFullName = mainStore.user?.name && mainStore.user?.surname 
    ? `${mainStore.user.name} ${mainStore.user.surname}` 
    : null
  
  console.log('canFinishWork check:', {
    currentUserId,
    currentUsername,
    currentUserFullName,
    stageStartedById: stage.value?.startedBy?.id,
    stageWho: stage.value?.who,
    stageStartedBy: stage.value?.startedBy
  })
  
  return (stage.value?.startedBy?.id === currentUserId) || 
         (stage.value?.who === currentUsername) ||
         (stage.value?.who === currentUserFullName)
})

const canCancelWork = computed(() => {
  const status = stage.value?.status || stage.value?.status_work
  if (status !== 'В работе') return false
  
  // Проверяем по новому полю startedBy или по старому полю who
  const currentUserId = mainStore.user?.id
  const currentUsername = mainStore.user?.username || mainStore.user?.email
  const currentUserFullName = mainStore.user?.name && mainStore.user?.surname 
    ? `${mainStore.user.name} ${mainStore.user.surname}` 
    : null
  
  return (stage.value?.startedBy?.id === currentUserId) || 
         (stage.value?.who === currentUsername) ||
         (stage.value?.who === currentUserFullName)
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

const getWorkerName = (user) => {
  console.log('getWorkerName called with:', user, 'type:', typeof user)
  
  if (!user) return null
  
  // Если это число (ID), возвращаем null, чтобы использовался stage.who
  if (typeof user === 'number') {
    console.log('User is a number ID, returning null to use stage.who')
    return null
  }
  
  // Если пользователь - это объект
  if (typeof user === 'object') {
    // Приоритет: имя + фамилия, затем отдельно имя или фамилия, потом username, email
    if (user.name && user.surname) {
      return `${user.name} ${user.surname}`
    }
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.name) return user.name
    if (user.surname) return user.surname
    if (user.firstName) return user.firstName
    if (user.lastName) return user.lastName
    return user.username || user.email
  }
  
  return null
}

const startWork = async () => {
  try {
    isUpdating.value = true
    
    console.log('Starting work - Current user:', mainStore.user)
    
    const updateData = {
      status: 'В работе',
      userId: mainStore.user?.id
    }

    console.log('Update data:', updateData)

    let updateUrl
    if (isSubStage.value) {
      updateUrl = `/etap-zagotovki/${subStage.value.id}/status`
    } else {
      updateUrl = `/etaps/${stage.value.id}/status`
    }

    const response = await axios.put(updateUrl, updateData)
    
    console.log('Server response:', response.data)
    
    // Обновляем локальные данные из ответа сервера
    if (isSubStage.value) {
      subStage.value = response.data.subStage
      stage.value = response.data.subStage
    } else {
      stage.value = response.data.stage
    }

    console.log('Updated stage data:', stage.value)

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
      updateUrl = `/etap-zagotovki/${subStage.value.id}/status`
    } else {
      updateUrl = `/etaps/${stage.value.id}/status`
    }

    const response = await axios.put(updateUrl, updateData)
    
    // Обновляем локальные данные из ответа сервера
    if (isSubStage.value) {
      subStage.value = response.data.subStage
      stage.value = response.data.subStage
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

const cancelWork = async () => {
  if (!confirm('Вы уверены, что хотите отменить работу над этапом?')) {
    return
  }

  try {
    isUpdating.value = true
    
    const updateData = {
      status: 'Не начат',
      userId: mainStore.user?.id
    }

    let updateUrl
    if (isSubStage.value) {
      updateUrl = `/etap-zagotovki/${subStage.value.id}/status`
    } else {
      updateUrl = `/etaps/${stage.value.id}/status`
    }

    const response = await axios.put(updateUrl, updateData)
    
    // Обновляем локальные данные из ответа сервера
    if (isSubStage.value) {
      subStage.value = response.data.subStage
      stage.value = response.data.subStage
    } else {
      stage.value = response.data.stage
    }

    // Показываем уведомление
    alert('Работа отменена!')
    
  } catch (err) {
    console.error('Error canceling work:', err)
    alert('Ошибка при отмене работы: ' + (err.response?.data?.message || err.message))
  } finally {
    isUpdating.value = false
  }
}

const goToStages = () => {
  // Получаем параметры для перехода на страницу этапов
  let elementId
  
  if (route.name === 'qr_stage') {
    elementId = route.params.elementId  
  } else {
    elementId = route.query.elementId
  }
  
  // Переходим на страницу этапов с нужными параметрами
  router.push({
    name: 'stages',
    query: {
      id: elementId
    }
  })
}

const loadData = async () => {
  try {
    isLoading.value = true
    error.value = ''

    // Получаем параметры из route (для QR-ссылок) или из query (для обычных ссылок)
    let projectId, elementId, stageId, subStageId
    
    if (route.name === 'qr_stage') {
      // QR-ссылка: параметры в route.params
      projectId = route.params.proektId
      elementId = route.params.elementId  
      stageId = route.params.stageId
      subStageId = route.query.subStageId // подэтап может быть в query
    } else {
      // Обычная ссылка: параметры в route.query
      projectId = route.query.projectId
      elementId = route.query.elementId
      stageId = route.query.stageId
      subStageId = route.query.subStageId
    }

    console.log('QR params:', { projectId, elementId, stageId, subStageId });
    
    if (!projectId || !elementId || !stageId) {
      throw new Error('Недостаточно параметров в URL')
    }

    // Загружаем проект
    console.log(`Loading project with ID: ${projectId}`);
    try {
      const projectsResponse = await axios.get('/proekts')
      const foundProject = projectsResponse.data.projects.find(p => p.id == projectId)
      if (!foundProject) {
        throw new Error(`Проект с ID ${projectId} не найден в списке проектов.`);
      }
      project.value = foundProject
    } catch (projectError) {
      console.error(`Project ${projectId} not found:`, projectError);
      throw new Error(`Проект с ID ${projectId} не найден. Возможно, он был удален или QR код устарел.`);
    }

    // Загружаем элемент
    const elementResponse = await axios.get(`/element/${elementId}`)
    element.value = elementResponse.data.element

    if (subStageId) {
      // Загружаем подэтап
      const subStageResponse = await axios.get(`/etap-zagotovki/${subStageId}`)
      subStage.value = subStageResponse.data.subStage
      stage.value = subStage.value

      // Загружаем родительский этап для названия
      const parentStageResponse = await axios.get(`/etaps/${stageId}`)
      parentStageName.value = parentStageResponse.data.stage.name
    } else {
      // Загружаем основной этап с пользовательскими данными
      const stageResponse = await axios.get(`/etaps/${stageId}`)
      stage.value = stageResponse.data.stage
    }

    // Отладочная информация
    console.log('Loaded stage data:', stage.value)

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
.order-details {
  padding: 20px 40px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.back {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1233ea;
  font-size: 14px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 10px;
  transition: color 0.2s;
}

.back:hover {
  color: #0f2ac5;
}

.back span {
  font-size: 18px;
  font-weight: bold;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1233EA;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p, .error-state p {
  color: #6B7280;
  font-size: 16px;
  margin: 0;
}

.back-btn {
  background-color: #1233EA;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 16px;
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
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-top: 20px;
}

.element-details h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #1233ea;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.details-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.details-section h5 {
  margin: 0 0 16px 0;
  color: #1233ea;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 12px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #555;
  min-width: 140px;
  flex-shrink: 0;
}

.detail-row span:last-child {
  text-align: right;
  word-break: break-word;
}

.document-id {
  font-family: monospace;
  font-size: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .detail-label {
    min-width: unset;
  }
  
  .detail-row span:last-child {
    text-align: left;
  }
}

/* Информационные блоки */
.info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #F9FAFB;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #E5E7EB;
    margin-bottom: 24px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #E5E7EB;
}

.info-item:last-child {
    border-bottom: none;
}

.info-item span:first-child {
    font-weight: 500;
    color: #6B7280;
    font-size: 14px;
}

.info-item span:last-child {
    color: #111827;
    font-weight: 600;
}

/* Секция управления работой */
.work-management-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-top: 20px;
}

.work-management-section h2 {
  margin: 0 0 12px 0;
  color: #1233ea;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.work-description {
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  font-style: italic;
}

.status-section {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  margin-bottom: 20px;
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

.completion-info {
  padding: 12px;
  background: #e8f5e8;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.work-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.btn-action {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 50px;
  flex: 1;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-action:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  height: 100%;
}

.btn-text {
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  color: white;
}

.btn-start {
  background: #1233EA;
  color: white;
  min-width: 250px;
  border: 1px solid #1233EA;
}

.btn-start:hover:not(:disabled) {
  background: #0f2ac5;
  border-color: #0f2ac5;
}

.btn-finish {
  background: #1233EA;
  color: white;
  border: 1px solid #1233EA;
}

.btn-finish:hover:not(:disabled) {
  background: #0f2ac5;
  border-color: #0f2ac5;
}

.btn-cancel {
  background: white;
  color: #6B7280;
  border: 1px solid #D1D5DB;
}

.btn-cancel:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #9CA3AF;
  color: #374151;
}

.btn-cancel .btn-text {
  color: #6B7280;
}

.btn-cancel:hover:not(:disabled) .btn-text {
  color: #374151;
}

.info-message, .success-message {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
}

.info-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.success-message {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

@media (max-width: 768px) {
  .order-details {
    padding: 16px 20px;
    gap: 20px;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .work-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .btn-start {
    min-width: 100%;
  }
  
  .btn-action {
    min-height: 45px;
  }
  
  .btn-content {
    padding: 10px 14px;
  }
  
  .btn-text {
    font-size: 14px;
  }
  
  .current-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .info-item span:last-child {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .order-details {
    padding: 12px 16px;
  }
  
  .wrap-title h2 {
    font-size: 20px;
  }
  
  .wrap-title h3 {
    font-size: 16px;
  }
  
  .work-management-section h2 {
    font-size: 18px;
  }
  
  .btn-action {
    min-height: 42px;
  }
  
  .btn-content {
    padding: 8px 12px;
  }
  
  .btn-text {
    font-size: 13px;
  }
}
</style>