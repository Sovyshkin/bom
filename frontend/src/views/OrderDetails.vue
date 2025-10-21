<script setup>
import BackButton from '@/components/BackButton.vue'
import { useMainStore } from '@/stores/main.ts'
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const mainStore = useMainStore()
const route = useRoute()
const elementTechCards = ref([])
const isLoading = ref(true)
const error = ref('')

// Вычисляемое свойство для группировки техкарт по материалам
const techCardsByMaterial = computed(() => {
  const grouped = {}
  elementTechCards.value.forEach(techCard => {
    const material = techCard.material || 'Не указан'
    if (!grouped[material]) {
      grouped[material] = []
    }
    grouped[material].push(techCard)
  })
  return grouped
})

onMounted(async() => {
    try {
        isLoading.value = true
        
        // Загружаем данные проекта
        await mainStore.getProekt(route.query.proektId)
        
        // Загружаем данные элемента
        await mainStore.getElement(route.query.elementId)
        
        // Получаем техкарты для этого элемента
        const isAuthorized = await mainStore.checkAuthBeforeRequest() 
        if (isAuthorized) {
            const elementIdFromUrl = route.query.elementId
            
            // Сначала пробуем получить техкарты напрямую по элементу
            try {
                const techCardsResponse = await axios.get(`/element-tehkarties/getByElement/${elementIdFromUrl}`)
                elementTechCards.value = techCardsResponse.data.techCards || []
            } catch (firstError) {
                elementTechCards.value = []
            }
            
            // Если техкарты не найдены, попробуем получить все техкарты проекта и отфильтровать
            if (elementTechCards.value.length === 0 && route.query.proektId) {
                try {
                    const projectTechCardsResponse = await axios.get(`/element-tehkarties/getByProject/${route.query.proektId}`)
                    const allTechCards = projectTechCardsResponse.data.techCards || []
                    
                    // Фильтруем техкарты по elementId
                    const filteredTechCards = allTechCards.filter(tc => {
                        const elementIdStr = elementIdFromUrl.toString()
                        const tcElementIdStr = tc.elementId ? tc.elementId.toString() : ''
                        
                        return tcElementIdStr === elementIdStr || 
                               tc.elementId === elementIdFromUrl ||
                               tc.elementId === parseInt(elementIdFromUrl)
                    })
                    
                    elementTechCards.value = filteredTechCards
                } catch (projectError) {
                    console.error('Failed to load project tech cards:', projectError)
                }
            }
        }
    } catch (err) {
        console.error('Error loading data:', err)
        error.value = 'Ошибка при загрузке данных'
    } finally {
        isLoading.value = false
    }
}) 
</script>
<template>
    <div class="order-details">
        <BackButton />
        
        <!-- Индикатор загрузки -->
        <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Загрузка данных...</p>
        </div>
        
        <!-- Сообщение об ошибке -->
        <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button @click="$router.go(-1)" class="back-btn">Вернуться назад</button>
        </div>
        
        <!-- Основной контент -->
        <template v-else>
            <h1>{{ mainStore.proektSelected?.name || 'Проект' }}</h1>
            <div class="wrap-title">
                <h2>{{ mainStore.elementSelected?.title || 'Элемент' }} {{mainStore.elementSelected.dimensions}}</h2>
                <h3>{{ mainStore.elementSelected?.constructionType || 'Тип конструкции не указан' }}</h3>
            </div>
            <div class="wrap-stage">
                <span>Стадия:</span>
                <div class="stage">
                    {{mainStore.elementSelected?.stage || 'Не указан'}}
                </div>
            </div>
        <div class="info">
            <div class="info-item">
                <span>The number is in order (No n/r):</span>
                <span>{{mainStore.proektSelected?.orderNumber || mainStore.proektSelected?.id || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Title-Subtitle-СIА (Титул-Подтитул-СІА):</span>
                <span>{{mainStore.proektSelected?.title || mainStore.proektSelected?.name || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Structure (Структура):</span>
                <span>{{mainStore.elementSelected?.structure || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Mark (Mapka):</span>
                <span>{{mainStore.elementSelected?.brand || mainStore.elementSelected?.title || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>DWG N° (НоМер ueptexa):</span>
                <span>{{mainStore.elementSelected?.drawingNumber || mainStore.proektSelected?.drawingNumber || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Sjheet No (Homep nucra):</span>
                <span>{{mainStore.elementSelected?.sheetNumber || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Description (Onucarne):</span>
                <span>{{mainStore.elementSelected?.description || mainStore.elementSelected?.title || 'Не указан'}}</span>
            </div>
            <div class="info-item">
                <span>Mark weight. kg (Веc марки.кг):</span>
                <span>{{mainStore.elementSelected?.weightNetSingle || mainStore.elementSelected?.weight || (elementTechCards.length > 0 ? elementTechCards.reduce((sum, tc) => sum + (tc.netWeightSingle || 0), 0).toFixed(2) : 'Не указан')}}</span>
            </div>
            <div class="info-item">
                <span>QТY(кол-во, шт.):</span>
                <span>{{mainStore.elementSelected?.quantity || (elementTechCards.length > 0 ? elementTechCards.reduce((sum, tc) => sum + (tc.quantity || 0), 0) : 'Не указан')}}</span>
            </div>
            <div class="info-item">
                <span>Total Weight, kg (Вес ecero, kr,):</span>
                <span>{{mainStore.elementSelected?.weightNetTotal || (elementTechCards.length > 0 ? elementTechCards.reduce((sum, tc) => sum + (tc.netWeightTotal || 0), 0).toFixed(2) : 'Не указан')}}</span>
            </div>
            <div class="info-item">
                <span>Anti-corrosion protection area per unit, m2 (площадь 1 детали):</span>
                <span>{{mainStore.elementSelected?.coatingAreaSingle || (elementTechCards.length > 0 && elementTechCards[0].coatingAreaSingle ? elementTechCards[0].coatingAreaSingle : 'Не указан')}}</span>
            </div>
            <div class="info-item">
                <span>Anti-corosion protection area per unit. m3 (общ. Площадь):</span>
                <span>{{mainStore.elementSelected?.coatingAreaTotal || (elementTechCards.length > 0 && elementTechCards[0].coatingAreaTotal ? elementTechCards[0].coatingAreaTotal : 'Не указан')}}</span>
            </div>
            <div class="info-item">
                <span>Толщина покрытия:</span>
                <span>{{mainStore.elementSelected?.coatingThickness || (elementTechCards.length > 0 && elementTechCards[0].coatingThickness ? elementTechCards[0].coatingThickness : 'Не указан')}}</span>
            </div>
        </div>

        <!-- Секция с техкартами элемента -->
        <div v-if="elementTechCards.length > 0" class="tech-cards-section">
            <h2>Техническая карта элемента</h2>
            <p class="tech-cards-description">
                Подробная спецификация материалов и характеристик для элемента "{{ mainStore.elementSelected?.title }}"
                (Найдено {{ elementTechCards.length }} техкарт)
            </p>
            
            <!-- Группировка по материалам -->
            <div v-for="(cards, material) in techCardsByMaterial" :key="material" class="material-group">
                <h3 class="material-title">{{ material }}</h3>
                
                <div class="tech-cards-grid">
                    <div v-for="techCard in cards" :key="techCard.id" class="tech-card">
                        <div class="tech-card-header">
                            <h4>{{ techCard.markName }}</h4>
                            <span v-if="techCard.shippingMark" class="shipping-mark">{{ techCard.shippingMark }}</span>
                        </div>
                        
                        <div class="tech-card-content">
                            <!-- Основные характеристики -->
                            <div class="characteristic-group">
                                <h5>Основные параметры</h5>
                                <div class="characteristics">
                                    <div v-if="techCard.quantity" class="char-item">
                                        <span>Количество:</span>
                                        <span>{{ techCard.quantity }} шт</span>
                                    </div>
                                    <div v-if="techCard.material" class="char-item">
                                        <span>Материал:</span>
                                        <span>{{ techCard.material }}</span>
                                    </div>
                                    <div v-if="techCard.profile" class="char-item">
                                        <span>Профиль:</span>
                                        <span>{{ techCard.profile }}</span>
                                    </div>
                                    <div v-if="techCard.steelGrade" class="char-item">
                                        <span>Марка стали:</span>
                                        <span>{{ techCard.steelGrade }}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Размеры -->
                            <div v-if="techCard.length || techCard.width || techCard.height" class="characteristic-group">
                                <h5>Размеры (мм)</h5>
                                <div class="characteristics">
                                    <div v-if="techCard.length" class="char-item">
                                        <span>Длина:</span>
                                        <span>{{ techCard.length }}</span>
                                    </div>
                                    <div v-if="techCard.width" class="char-item">
                                        <span>Ширина:</span>
                                        <span>{{ techCard.width }}</span>
                                    </div>
                                    <div v-if="techCard.height" class="char-item">
                                        <span>Высота:</span>
                                        <span>{{ techCard.height }}</span>
                                    </div>
                                    <div v-if="techCard.flangeThickness" class="char-item">
                                        <span>Толщина полки:</span>
                                        <span>{{ techCard.flangeThickness }}</span>
                                    </div>
                                    <div v-if="techCard.wallThickness" class="char-item">
                                        <span>Толщина стенки:</span>
                                        <span>{{ techCard.wallThickness }}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Вес -->
                            <div v-if="techCard.netWeightSingle || techCard.netWeightTotal" class="characteristic-group">
                                <h5>Вес (кг)</h5>
                                <div class="characteristics">
                                    <div v-if="techCard.netWeightSingle" class="char-item">
                                        <span>Вес единицы:</span>
                                        <span>{{ techCard.netWeightSingle }}</span>
                                    </div>
                                    <div v-if="techCard.netWeightTotal" class="char-item">
                                        <span>Общий вес:</span>
                                        <span>{{ techCard.netWeightTotal }}</span>
                                    </div>
                                    <div v-if="techCard.grossWeightSingle" class="char-item">
                                        <span>Вес брутто единицы:</span>
                                        <span>{{ techCard.grossWeightSingle }}</span>
                                    </div>
                                    <div v-if="techCard.grossWeightTotal" class="char-item">
                                        <span>Общий вес брутто:</span>
                                        <span>{{ techCard.grossWeightTotal }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    
        </template>
    </div>
</template>
<style scoped>
.order-details {
  padding: 20px 40px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Состояния загрузки и ошибки */
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

.error-state p {
    color: #EF4444;
    margin-bottom: 16px;
}

.back-btn {
    padding: 12px 24px;
    background: #1233EA;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
}

.back-btn:hover {
    background: #0F2AC5;
}
.wrap-title {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

h1 {
    font-size: 24px;
    font-weight: 500;
    color: #14171f;
}

h2 {
    font-size: 20px;
    font-weight: 500;
    color: #14171f;
}

h3 {
    font-size: 16px;
    font-weight: 500;
    color: #8C93A6;
}

.wrap-stage {
    display: flex;
    align-items: center;
    gap: 18px;
}

.wrap-stage span {
    color: #8C93A6;
    font-size: 14px;
    font-weight: 500;
}

.stage {
    background: rgba(239, 83, 7, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
    color: #EF5307;
    font-size: 14px;
    font-weight: 500;
}

.info {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Стили для техкарт */
.tech-cards-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #E5E7EB;
}

.tech-cards-description {
    color: #6B7280;
    font-size: 14px;
    margin: 8px 0 24px 0;
}

.material-group {
    margin-bottom: 32px;
}

.material-title {
    font-size: 18px;
    font-weight: 600;
    color: #1233EA;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(18, 51, 234, 0.1);
}

.tech-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.tech-card {
    background: #F8F9FA;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s ease;
}

.tech-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #1233EA;
}

.tech-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #E5E7EB;
}

.tech-card-header h4 {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0;
}

.shipping-mark {
    background: #EF5307;
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
}

.tech-card-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.characteristic-group h5 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.characteristics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.char-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
}

.char-item span:first-child {
    color: #6B7280;
    font-weight: 500;
}

.char-item span:last-child {
    color: #111827;
    font-weight: 600;
}

.no-tech-cards {
    margin-top: 32px;
    padding: 32px 24px;
    background: #F9FAFB;
    border: 1px dashed #D1D5DB;
    border-radius: 12px;
    text-align: center;
}

.no-tech-cards h3 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 16px 0;
}

.no-tech-cards p {
    color: #6B7280;
    font-size: 14px;
    margin: 8px 0;
    line-height: 1.5;
}

.no-tech-cards .hint {
    font-size: 12px;
    color: #9CA3AF;
    font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
    .order-details {
        padding: 16px 20px;
        gap: 20px;
    }
    
    .tech-cards-grid {
        grid-template-columns: 1fr;
    }
    
    .characteristics {
        grid-template-columns: 1fr;
    }
    
    .tech-card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}
</style>