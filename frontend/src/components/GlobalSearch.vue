<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '@/stores/main.ts'

const router = useRouter()
const mainStore = useMainStore()

const searchQuery = ref('')
const isDropdownOpen = ref(false)
const searchInput = ref(null)

// Debounced search
let searchTimeout = null

const performSearch = async () => {
  if (searchQuery.value.trim().length >= 2) {
    await mainStore.globalSearch(searchQuery.value)
    isDropdownOpen.value = true
  } else {
    mainStore.clearSearchResults()
    isDropdownOpen.value = false
  }
}

// Watch для автоматического поиска при вводе
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300) // Задержка 300ms
})

// Закрытие выпадающего списка при клике вне
const handleClickOutside = (event) => {
  if (searchInput.value && !searchInput.value.contains(event.target) && 
      !event.target.closest('.search-dropdown')) {
    isDropdownOpen.value = false
  }
}

const navigateToResult = async (result) => {
  isDropdownOpen.value = false
  searchQuery.value = ''
  mainStore.clearSearchResults()
  
  console.log('Navigating to result:', result)
  
  switch (result.type) {
    case 'project':
      // Устанавливаем выбранный проект
      await mainStore.getProekt(result.id)
      router.push({ name: 'details', query: { id: result.id } })
      break
      
    case 'element':
      // Устанавливаем выбранный проект и элемент
      mainStore.proektId = result.projectId
      await mainStore.getProekt(result.projectId)
      await mainStore.getElement(result.id)
      router.push({ 
        name: 'stages', 
        query: { 
          projectId: result.projectId,
          elementId: result.id
        }
      })
      break
      
    case 'stage':
      if (result.elementId) {
        // Переходим к заготовкам стадии
        const projectId = await findProjectIdForElement(result.elementId)
        if (projectId) {
          mainStore.proektId = projectId
          await mainStore.getProekt(projectId)
          await mainStore.getElement(result.elementId)
          await mainStore.getStage(result.id)
          router.push({ 
            name: 'blank_stages', 
            query: { 
              projectId: projectId,
              elementId: result.elementId,
              stageId: result.id
            }
          })
        }
      }
      break
      
    default:
      console.warn('Unknown result type:', result.type)
  }
}

// Вспомогательная функция для поиска проекта по элементу
const findProjectIdForElement = async (elementId) => {
  try {
    // Получаем элемент чтобы узнать его проект
    await mainStore.getElement(elementId)
    return mainStore.elementSelected?.proektId
  } catch (error) {
    console.error('Error finding project for element:', error)
    return null
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  isDropdownOpen.value = false
  mainStore.clearSearchResults()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearTimeout(searchTimeout)
})
</script>

<template>
  <div class="search-container" ref="searchInput">
    <div class="search-input-wrapper">
      <input 
        type="text" 
        placeholder="Поиск" 
        id="search"
        v-model="searchQuery"
        @focus="isDropdownOpen = true"
        class="search-input"
      >
      <!-- Кнопка очистки -->
      <button 
        v-if="searchQuery" 
        @click="clearSearch"
        class="clear-button"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <label for="search" class="search-icon">
        <img src="@/assets/search.svg" alt="">
      </label>
      
    </div>
    
    <!-- Выпадающий список результатов -->
    <div 
      v-if="isDropdownOpen && (mainStore.searchResults.projects?.length || 
                               mainStore.searchResults.elements?.length || 
                               mainStore.searchResults.stages?.length)"
      class="search-dropdown"
    >
      <!-- Загрузка -->
      <div v-if="mainStore.isSearching" class="search-loading">
        Поиск...
      </div>
      
      <!-- Результаты -->
      <div v-else class="search-results">
        <!-- Проекты -->
        <div v-if="mainStore.searchResults.projects?.length" class="result-section">
          <h4 class="section-title">Проекты</h4>
          <div 
            v-for="project in mainStore.searchResults.projects" 
            :key="'project-' + project.id"
            @click="navigateToResult(project)"
            class="result-item"
          >
            <div class="result-icon">📁</div>
            <div class="result-content">
              <div class="result-title">{{ project.name }}</div>
              <div class="result-subtitle">Статус: {{ project.status }}</div>
            </div>
          </div>
        </div>
        <!-- Элементы -->
        <div v-if="mainStore.searchResults.elements?.length" class="result-section">
          <h4 class="section-title">Элементы</h4>
          <div 
            v-for="element in mainStore.searchResults.elements" 
            :key="'element-' + element.id"
            @click="navigateToResult(element)"
            class="result-item"
          >
            <div class="result-icon">🔧</div>
            <div class="result-content">
              <div class="result-title">{{ element.title }} {{ element.brand }}</div>
              <div class="result-subtitle">Проект ID: {{ element.projectId - 1 }}</div>
            </div>
          </div>
        </div>
        
        <!-- Этапы -->
        <div v-if="mainStore.searchResults.stages?.length" class="result-section">
          <h4 class="section-title">Этапы</h4>
          <div 
            v-for="stage in mainStore.searchResults.stages" 
            :key="'stage-' + stage.id"
            @click="navigateToResult(stage)"
            class="result-item"
          >
            <div class="result-icon">⚙️</div>
            <div class="result-content">
              <div class="result-title">{{ stage.name }}</div>
              <div class="result-subtitle">Элемент ID: {{ stage.elementId - 1}}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Пустые результаты -->
      <div 
        v-if="!mainStore.isSearching && searchQuery.length >= 2 && 
              !mainStore.searchResults.projects?.length && 
              !mainStore.searchResults.elements?.length && 
              !mainStore.searchResults.stages?.length"
        class="no-results"
      >
        Ничего не найдено по запросу "{{ searchQuery }}"
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
    outline: none;
}

.search-icon {
  position: absolute;
  right: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.clear-button {
  position: absolute;
  right: 32px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.clear-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.search-loading {
  padding: 16px;
  text-align: center;
  color: #666;
}

.search-results {
  padding: 8px 0;
}

.result-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin: 0;
  padding: 8px 16px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: #f8f9fa;
}

.result-icon {
  margin-right: 12px;
  font-size: 16px;
}

.result-content {
  flex: 1;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.result-subtitle {
  font-size: 12px;
  color: #666;
}

.no-results {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .search-container {
    max-width: 100%;
  }
  
  .search-dropdown {
    max-height: 300px;
  }
}
</style>