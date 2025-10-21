<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from 'vue-router'
import AddProjectModal from '@/components/AddProjectModal.vue'
import AddTehkartaModal from '@/components/AddTehkartaModal.vue'
import { useMainStore } from '@/stores/main.ts'

const router = useRouter()
const mainStore = useMainStore()

const activeFilter = ref("all");
const searchQuery = ref("");
const displayedProjects = ref([]);
const isLoading = ref(false);

// Обновление отображаемых проектов
const updateDisplayedProjects = () => {
  let filtered = mainStore.proekts || [];

  // Фильтрация по статусу
  if (activeFilter.value !== "all") {
    filtered = filtered.filter(
      (project) => project.status_work === activeFilter.value
    );
  }

  // Фильтрация по поиску
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (project) =>
        project.name?.toLowerCase().includes(query) ||
        (project.id && project.id.toString().includes(query))
    );
  }

  displayedProjects.value = filtered;
};

// Обработчики изменений фильтров
const setFilter = (filter) => {
  activeFilter.value = filter;
  updateDisplayedProjects();
};

const addTechCard = (projectId, event, isReplacing = false) => {
  event?.stopPropagation();
  console.log(isReplacing ? "Заменить тех. карту для проекта:" : "Добавить тех. карту для проекта:", projectId);
  mainStore.isAddTehkartaModalOpen = true;
  mainStore.proektId = projectId;
  mainStore.isReplacingTechCard = isReplacing;
  mainStore.replacementType = 'techcard'; // Устанавливаем тип операции - техкарты
};

const replaceProject = (projectId, event) => {
  event?.stopPropagation();
  console.log("Заменить весь проект:", projectId);
  mainStore.isAddTehkartaModalOpen = true;
  mainStore.proektId = projectId;
  mainStore.isReplacingTechCard = true;
  mainStore.replacementType = 'project'; // Устанавливаем тип операции - весь проект
};

const viewDetails = (projectId) => {
  router.push({ name: 'details', query: { id: projectId } });
};

// Загрузка проектов при попадании на страницу
const loadProjects = async () => {
  try {
    isLoading.value = true;
    await mainStore.getProekts();
    updateDisplayedProjects();
  } catch (err) {
    console.error('Error loading projects:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadProjects();
});
</script>

<template>
  <div class="projects-page">
    <h1>Проекты</h1>
    
    <div class="header-actions">
      <div class="filter-buttons">
        <button
          :class="['filter-btn', { active: activeFilter === 'all' }]"
          @click="setFilter('all')"
        >
          Все
        </button>
        <button
          :class="['filter-btn', { active: activeFilter === 'В работе' }]"
          @click="setFilter('В работе')"
        >
          В работе
        </button>
        <button
          :class="['filter-btn', { active: activeFilter === 'Готов' }]"
          @click="setFilter('Готов')"
        >
          Готовы
        </button>
      </div>

      <button class="add-project-btn desktop-view" @click="mainStore.isAddProjectModalOpen = true">
        Добавить проект
      </button>
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="loading">
      Загрузка проектов...
    </div>

    <!-- Сообщение если нет проектов -->
    <div v-else-if="displayedProjects.length === 0" class="no-projects">
      Проекты не найдены
    </div>

    <!-- Desktop и Mobile View когда есть проекты -->
    <template v-else>
      <!-- Desktop View with Blocks -->
      <div class="projects-container desktop-view">
        <div class="projects-header">
          <div class="header-cell">Название проекта</div>
          <div class="header-cell">Номер</div>
          <div class="header-cell">Статус</div>
          <div class="header-cell">Действия</div>
          <div class="header-cell"></div>
        </div>
        
        <div
          v-for="project in displayedProjects"
          :key="project.id"
          class="project-row"
          @click="viewDetails(project.id)"
        >
          <div class="project-cell name-cell">{{ project.name }}</div>
          <div class="project-cell number-cell">{{ project.id }}</div>
          <div class="project-cell status-cell">
            <span
              :class="[
                'status-badge',
                project.status_work.toLowerCase().replace(' ', '-'),
              ]"
            >
              {{ project.status_work }}
            </span>
          </div>
          <div class="project-cell action-cell">
            <button
              class="action-btn add-tech-btn"
              :class="{ 'replace-tech-btn': project.hasTechCard }"
              @click="addTechCard(project.id, $event, project.hasTechCard)"
            >
              {{ project.hasTechCard ? 'Заменить тех. карту' : 'Добавить тех. карту' }}
            </button>
            <button
              v-if="project.hasTechCard"
              class="action-btn replace-project-btn"
              @click="replaceProject(project.id, $event)"
              style="margin-left: 8px;"
            >
              Заменить проект
            </button>
          </div>
          <div class="project-cell arrow-cell">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 13L10.5 8L5.5 3" stroke="#8C93A6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Mobile Cards -->
      <div class="projects-cards mobile-view">
        <div
          v-for="project in displayedProjects"
          :key="project.id"
          class="project-card"
          @click="viewDetails(project.id)"
        >
          <div class="card-header">
            <h3>{{ project.name }}</h3>
            <span
              :class="[
                'status-badge',
                project.status_work.toLowerCase().replace(' ', '-'),
              ]"
            >
              {{ project.status_work }}
            </span>
          </div>

          <div class="card-content">
            <p class="project-number">Номер: {{ project.id }}</p>

            <div class="card-actions">
              <button
                class="action-btn add-tech-btn"
                @click="addTechCard(project.id, $event, project.hasTechCard)"
              >
                {{ project.hasTechCard ? 'Заменить тех. карту' : 'Добавить тех. карту' }}
              </button>

              <button
                v-if="project.hasTechCard"
                class="action-btn replace-project-btn"
                @click="replaceProject(project.id, $event)"
              >
                Заменить проект
              </button>

              <button
                class="action-btn view-details-btn"
                @click="viewDetails(project.id)"
              >
                Смотреть подробнее
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <AddProjectModal/>
    <AddTehkartaModal />
  </div>
</template>

<style scoped>
.projects-page {
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
  margin: 0 0 16px 0;
}

.header-actions {
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
  padding: 17.5px 24px;
  background-color: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #8c93a6;
  font-weight: 500;
  transition: all 0.3s ease;
}

.filter-btn.active,
.filter-btn:hover {
  background-color: #1233ea;
  color: white;
}

.add-project-btn {
  padding: 17.5px 24px;
  background-color: #1233ea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-project-btn:hover {
  background-color: #0f2ac5;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #8c93a6;
}

.no-projects {
  text-align: center;
  padding: 40px;
  color: #8c93a6;
  font-size: 16px;
}

/* Projects Container with Blocks */
.projects-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Убираем overflow: hidden чтобы разрешить прокрутку */
}

.projects-header {
  display: flex;
  padding: 20px;
}

.header-cell {
  flex: 1;
  color: #8C93A6;
  font-weight: 500;
  font-size: 14px;
}

.header-cell:last-child {
  flex: 0 0 50px;
}

.project-row {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #F1F2F4;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.project-row:hover {
  background-color: #f8f9fb;
}

.project-cell {
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
  color: #EF5307;
  font-weight: 500;
  font-size: 14px;
}

.status-badge.готов {
  background: rgba(8, 184, 29, 0.1);
  color: #08B81D;
  font-weight: 500;
  font-size: 14px;
}

/* Action Buttons */
.action-btn {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-tech-btn {
  color: #1233EA;
}

.view-details-btn {
  background: #1233EA;
  color: #fff;
}

/* Mobile Cards */
.projects-cards {
  display: none;
}

.project-card {
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

.project-number {
  color: #666;
  margin-bottom: 15px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.replace-tech-btn {
  color: #EF5307;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-buttons {
    flex-wrap: wrap;
  }

  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: flex;
    flex-direction: column;
  }

  .card-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    text-align: center;
  }
  
  .action-cell {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .action-cell .action-btn {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .projects-page {
    padding: 16px;
  }
  
  h1 {
    font-size: 24px;
  }
  
  .filter-btn,
  .add-project-btn {
    padding: 14px 20px;
    font-size: 13px;
  }
  
  .project-card {
    padding: 16px;
  }
  
  .card-header h3 {
    font-size: 14px;
  }
}

@media (min-width: 769px) {
  .desktop-view {
    display: flex;
  }

  .mobile-view {
    display: none;
  }
}
</style>