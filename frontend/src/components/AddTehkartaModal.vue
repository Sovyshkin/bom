<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useMainStore } from "@/stores/main.ts";

const mainStore = useMainStore();
const fileInput = ref(null);
const isDragging = ref(false);
const uploadedFile = ref(null);

// Watcher временно отключен для отладки
// watch(() => mainStore.tehkartaFile, (newValue, oldValue) => {
//   console.log('=== TEHKARTA FILE CHANGED ===');
//   console.log('Old value:', oldValue);
//   console.log('New value:', newValue);
//   if (newValue === null && oldValue !== null) {
//     console.log('WARNING: tehkartaFile was cleared!');
//     console.trace('Stack trace for file clearing');
//   }
// }, { deep: true });

const closeModal = () => {
  mainStore.isAddTehkartaModalOpen = false;
  // Сбрасываем загруженный файл при закрытии модального окна
  uploadedFile.value = null;
  mainStore.tehkartaFile = null; // Очищаем файл из store
};

const handleEscape = (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
};

const stopPropagation = (event) => {
  event.stopPropagation();
};

// Обработчики drag and drop
const handleDragOver = (event) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  isDragging.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragging.value = false;
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    handleFileUpload(files[0]);
  }
};

// Обработка выбора файла через кнопку
const handleFileSelect = () => {
  if (!uploadedFile.value) {
    fileInput.value?.click();
  }
};

const handleFileInputChange = (event) => {
  const file = event.target.files[0];
  console.log('=== FILE INPUT CHANGE ===');
  console.log('Selected file:', file);
  if (file) {
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    uploadedFile.value = file;
    mainStore.tehkartaFile = file; // Сохраняем файл в store
    
    console.log('After saving:');
    console.log('uploadedFile.value:', uploadedFile.value);
    console.log('mainStore.tehkartaFile:', mainStore.tehkartaFile);
    console.log('=== END FILE INPUT CHANGE ===');
  }
};

// Удаление загруженного файла
const removeFile = () => {
  uploadedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Основная функция обработки файла
const handleFileUpload = (file) => {
  console.log('File received in handleFileUpload:', file);
  if (file) {
    uploadedFile.value = file;
    mainStore.tehkartaFile = file; // Сохраняем файл в store
    console.log('File saved to store (tehkartaFile):', mainStore.tehkartaFile);
  }
};

const proceed = () => {
  console.log('=== PROCEED CLICKED ===');
  console.log('uploadedFile.value:', uploadedFile.value);
  console.log('mainStore.tehkartaFile:', mainStore.tehkartaFile);
  console.log('mainStore.tehkartaFile instanceof File:', mainStore.tehkartaFile instanceof File);
  console.log('uploadedFile.value instanceof File:', uploadedFile.value instanceof File);
  
  // Добавим детальную проверку состояния files
  if (uploadedFile.value) {
    console.log('uploadedFile.value details:', {
      name: uploadedFile.value.name,
      size: uploadedFile.value.size,
      type: uploadedFile.value.type
    });
  } else {
    console.log('uploadedFile.value is null/undefined');
  }
  
  if (mainStore.tehkartaFile) {
    console.log('mainStore.tehkartaFile details:', {
      name: mainStore.tehkartaFile.name,
      size: mainStore.tehkartaFile.size,
      type: mainStore.tehkartaFile.type
    });
  } else {
    console.log('mainStore.tehkartaFile is null/undefined');
  }
  
  // Проверяем наличие файла в локальной переменной или в store
  let fileToUse = uploadedFile.value || mainStore.tehkartaFile;
  
  if (!fileToUse) {
    console.log('No file found anywhere!');
    alert('Пожалуйста, выберите файл Excel');
    return;
  }
  
  console.log('Using file:', fileToUse);
  console.log('File name:', fileToUse.name);
  console.log('File size:', fileToUse.size);
  
  // Проверяем тип операции
  console.log('Operation type:', mainStore.replacementType);
  
  // Передаем файл напрямую в функции store как параметр
  if (mainStore.replacementType === 'project') {
    console.log('Calling replaceProjectElements with file...');
    mainStore.replaceProjectElements(fileToUse);
  } else {
    console.log('Calling tehkartaUpload with file...');
    mainStore.tehkartaUpload(fileToUse);
  }
};

// Функция для форматирования размера файла
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  document.addEventListener("keydown", handleEscape);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
  document.body.style.overflow = "auto";
});
</script>

<template>
  <transition name="modal">
    <div
      v-if="mainStore.isAddTehkartaModalOpen"
      class="modal-overlay"
      @click="closeModal"
    >
      <div class="modal-content" @click="stopPropagation">
        <div class="modal-header">
          <h2>
            {{ 
              mainStore.replacementType === 'project' 
                ? 'Заменить проект' 
                : (mainStore.isReplacingTechCard ? 'Заменить техкарту' : 'Добавить техкарту') 
            }}
          </h2>
          <button class="close-btn" @click="closeModal">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Блок загрузки файла (показывается, если файл не загружен) -->
          <div 
            v-if="!uploadedFile"
            class="wrap-body"
            :class="{ 'dragging': isDragging }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @click="handleFileSelect"
          >
            <div class="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2V8H20" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13H8" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17H8" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 9H9H8" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Перетащите файл техкарты сюда или нажмите для выбора</h3>
            <div class="more-info">
              <p>Поддерживаемые форматы: Excel (.xlsx, .xls), CSV, PDF</p>
            </div>
          </div>

          <!-- Блок отображения загруженного файла (показывается, если файл загружен) -->
          <div v-else class="file-info">
            <div class="file-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2V8H20" stroke="#1233EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="file-details">
              <h3>{{ uploadedFile.name }}</h3>
              <p>{{ formatFileSize(uploadedFile.size) }}</p>
            </div>
            <button class="remove-file-btn" @click="removeFile">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="upload-section">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              style="display: none"
              @change="handleFileInputChange"
            />
            
            <!-- Кнопка загрузки (показывается, если файл не загружен) -->
            <button v-if="!uploadedFile" class="upload-btn" @click="handleFileSelect">
              Загрузить с устройства
            </button>
            
            <!-- Кнопка продолжить (показывается, если файл загружен) -->
            <button v-else class="proceed-btn" @click="proceed" :disabled="mainStore.isLoading">
              <span v-if="mainStore.isLoading">Загрузка...</span>
              <span v-else>Продолжить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap');

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(-50px);
  opacity: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #8c93a6;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  display: flex;
  flex-direction: column;
}

.wrap-body {
  padding: 64px 24px;
  border: 2px dashed rgba(20, 23, 31, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.wrap-body:hover {
  border-color: #1233EA;
  background-color: rgba(18, 51, 234, 0.05);
}

.wrap-body.dragging {
  border-color: #1233EA;
  background-color: rgba(18, 51, 234, 0.1);
  transform: scale(1.02);
}

.upload-icon {
  color: #1233EA;
}

.more-info {
  display: flex;
  flex-direction: column;
  opacity: 70%;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.modal-body h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.more-info p {
  font-family: "Manrope", sans-serif;
  font-size: 14px;
  text-align: center;
  margin: 0;
}

/* Стили для отображения информации о файле */
.file-info {
  padding: 32px 24px;
  border: 2px solid rgba(18, 51, 234, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background-color: rgba(18, 51, 234, 0.05);
}

.file-icon {
  color: #1233EA;
  flex-shrink: 0;
}

.file-details {
  flex-grow: 1;
  overflow: hidden;
}

.file-details h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-details p {
  margin: 0;
  font-size: 14px;
  color: #8c93a6;
}

.remove-file-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #8c93a6;
  transition: color 0.3s ease;
  flex-shrink: 0;
  border-radius: 4px;
}

.remove-file-btn:hover {
  color: #ff3b30;
  background-color: rgba(255, 59, 48, 0.1);
}

.upload-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-btn {
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  background-color: #1233ea;
  color: white;
}

.upload-btn:hover {
  background-color: #0f2ac5;
}

.proceed-btn {
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  background-color: #1233ea;
  color: white;
}

.proceed-btn:hover {
  background-color: #0f2ac5;
}

.proceed-btn:disabled {
  background-color: #ccc !important;
  color: white !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.proceed-btn:disabled:hover {
  background-color: #ccc !important;
  color: white !important;
}

.proceed-btn span {
  color: inherit;
}

/* Анимация для drag and drop */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.wrap-body.dragging {
  animation: pulse 1s ease-in-out infinite;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-width: 100%;
    padding: 20px;
    gap: 20px;
  }
  
  .modal-header h2 {
    font-size: 18px;
  }
  
  .wrap-body {
    padding: 40px 16px;
  }
  
  .wrap-body h3 {
    font-size: 14px;
    text-align: center;
  }
  
  .wrap-body p {
    font-size: 12px;
    text-align: center;
  }
  
  .file-info {
    padding: 12px;
  }
  
  .file-name {
    font-size: 14px;
  }
  
  .file-details {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .modal-content {
    padding: 16px;
  }
  
  .wrap-body {
    padding: 30px 12px;
  }
  
  .upload-btn,
  .proceed-btn {
    padding: 14px 20px;
    font-size: 13px;
  }
}
</style>