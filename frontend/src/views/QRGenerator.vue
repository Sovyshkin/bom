<template>
  <div class="qr-generator">
    <h2>Генератор QR-кодов для этапов</h2>
    
    <div class="form-section">
      <h3>Параметры этапа:</h3>
      
      <div class="input-group">
        <label>ID проекта:</label>
        <input v-model="proektId" type="text" placeholder="Введите ID проекта">
        <small>Например: 1, 2, 3...</small>
      </div>
      
      <div class="input-group">
        <label>ID элемента:</label>
        <input v-model="elementId" type="text" placeholder="Введите ID элемента">
        <small>Например: 25, 78, 156...</small>
      </div>
      
      <div class="input-group">
        <label>ID этапа:</label>
        <input v-model="stageId" type="text" placeholder="Введите ID этапа">
        <small>Например: 156, 789, 234...</small>
      </div>
      
      <div class="test-buttons">
        <button @click="fillTestData" class="btn-test">
          Заполнить тестовыми данными
        </button>
        <button @click="generateQR" class="btn-generate">
          Сгенерировать QR-код
        </button>
      </div>
    </div>
    
    <div v-if="qrUrl" class="qr-result">
      <h3>QR-код для этапа:</h3>
      <div class="qr-display">
        <canvas ref="qrCanvas"></canvas>
      </div>
      <p class="qr-url">{{ qrUrl }}</p>
      <button @click="copyUrl" class="btn-copy">Копировать ссылку</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const proektId = ref('')
const elementId = ref('')
const stageId = ref('')
const qrUrl = ref('')
const qrCanvas = ref(null)

const generateQR = async () => {
  if (!proektId.value || !elementId.value || !stageId.value) {
    alert('Пожалуйста, заполните все поля')
    return
  }
  
  // Генерируем URL для QR-кода
  const baseUrl = 'http://192.168.2.252'
  qrUrl.value = `${baseUrl}/qr/${proektId.value}/${elementId.value}/${stageId.value}`
  
  // Генерируем QR-код (используем простую библиотеку или внешний сервис)
  await nextTick()
  
  // Используем внешний API для генерации QR-кода
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl.value)}`
  
  // Загружаем QR-код как изображение на canvas
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = qrCanvas.value
    const ctx = canvas.getContext('2d')
    canvas.width = 300
    canvas.height = 300
    ctx.drawImage(img, 0, 0, 300, 300)
  }
  img.src = qrApiUrl
}

const fillTestData = () => {
  proektId.value = '1'
  elementId.value = '25'
  stageId.value = '156'
}

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(qrUrl.value)
    alert('Ссылка скопирована в буфер обмена!')
  } catch (err) {
    console.error('Ошибка копирования:', err)
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea')
    textArea.value = qrUrl.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('Ссылка скопирована!')
  }
}
</script>

<style scoped>
.qr-generator {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.test-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-generate,
.btn-copy,
.btn-test {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-test {
  background: #28a745;
}

.btn-generate:hover,
.btn-copy:hover {
  background: #0056b3;
}

.btn-test:hover {
  background: #218838;
}

.input-group small {
  color: #666;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.qr-result {
  text-align: center;
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.qr-display {
  margin: 20px 0;
}

.qr-url {
  word-break: break-all;
  background: #fff;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
}
</style>