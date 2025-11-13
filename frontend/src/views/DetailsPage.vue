<!-- eslint-disable -->
<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from 'vue-router'
import BackButton from '@/components/BackButton.vue'
import { useMainStore } from '@/stores/main.ts'
import QRCode from 'qrcode'
import axios from 'axios'

const mainStore = useMainStore()
const router = useRouter()
const route = useRoute()

const statusFilter = ref("all");
const stageFilter = ref("all");
const searchQuery = ref("");
const isLoading = ref(false);
const isPrinting = ref(false);

const statusOptions = [
  { value: "all", label: "Все статусы" },
  { value: "В работе", label: "В работе" },
  { value: "Готов", label: "Готов" },
];

const stageOptions = [
  { value: "all", label: "Все этапы" },
  { value: "Заготовка", label: "Заготовка" },
  { value: "Комплектовка", label: "Комплектовка" },
  { value: "Сборка", label: "Сборка" },
  { value: "Сварка", label: "Сварка" },
  { value: "Покраска", label: "Покраска" },
  { value: "Отгрузка", label: "Отгрузка" },
];

// Функция для безопасного получения класса статуса
const getStatusClass = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace(' ', '-');
};

// Computed свойство для объединения элементов проекта с данными техкарт
const elementsWithTechCards = computed(() => {
  const elements = mainStore.elements || [];
  const techCards = mainStore.projectTechCards || [];
  
  return elements.map(element => {
    // Ищем соответствующие техкарты для данного элемента
    const relatedTechCards = techCards.filter(techCard => {
      // Только прямое сопоставление по elementId
      return techCard.elementId && (
        techCard.elementId === element.id.toString() ||
        techCard.elementId === element.id ||
        parseInt(techCard.elementId) === element.id
      );
    });
    
    // Если есть техкарты, дополняем элемент их данными
    if (relatedTechCards.length > 0) {
      // Агрегируем данные из всех техкарт
      const aggregatedData = relatedTechCards.reduce((acc, techCard) => {
        // Суммируем количество
        acc.totalQuantity += techCard.quantity || 0;
        
        // Собираем уникальные материалы
        if (techCard.material && !acc.materials.includes(techCard.material)) {
          acc.materials.push(techCard.material);
        }
        
        // Собираем уникальные профили
        if (techCard.profile && !acc.profiles.includes(techCard.profile)) {
          acc.profiles.push(techCard.profile);
        }
        
        // Суммируем веса
        acc.totalNetWeight += techCard.netWeightSingle || 0;
        acc.totalGrossWeight += techCard.grossWeightSingle || 0;
        
        // Собираем отправочные марки
        if (techCard.shippingMark && !acc.shippingMarks.includes(techCard.shippingMark)) {
          acc.shippingMarks.push(techCard.shippingMark);
        }
        
        // Собираем позиции деталей
        if (techCard.partPosition && !acc.partPositions.includes(techCard.partPosition)) {
          acc.partPositions.push(techCard.partPosition);
        }
        
        return acc;
      }, {
        totalQuantity: 0,
        materials: [],
        profiles: [],
        totalNetWeight: 0,
        totalGrossWeight: 0,
        shippingMarks: [],
        partPositions: []
      });
      
      return {
        ...element,
        // Используем агрегированные данные
        quantity: aggregatedData.totalQuantity || element.quantity,
        material: aggregatedData.materials.length > 0 ? aggregatedData.materials.join(', ') : element.material,
        profile: aggregatedData.profiles.length > 0 ? aggregatedData.profiles.join(', ') : element.profile,
        netWeightSingle: aggregatedData.totalNetWeight || element.weightNetSingle,
        netWeightTotal: aggregatedData.totalNetWeight || element.weightNetTotal,
        shippingMark: aggregatedData.shippingMarks.join(', '),
        partPosition: aggregatedData.partPositions.join(', '),
        // Дополнительная информация из первой техкарты
        length: relatedTechCards[0].length || element.length,
        width: relatedTechCards[0].width || element.width,
        height: relatedTechCards[0].height || element.height,
        steelGrade: relatedTechCards[0].steelGrade || element.steelGrade,
        crossSectionArea: relatedTechCards[0].crossSectionArea,
        coatingAreaTotal: relatedTechCards[0].coatingAreaTotal,
        // Добавляем агрегированную информацию
        aggregatedData: aggregatedData,
        techCards: relatedTechCards,
        hasTechCard: true
      };
    }
    
    // Если техкарт нет, возвращаем элемент как есть
    return {
      ...element,
      techCards: [],
      hasTechCard: false
    };
  });
});

const filteredParts = computed(() => {
  let filtered = elementsWithTechCards.value || [];

  // Фильтрация по статусу
  if (statusFilter.value !== "all") {
    filtered = filtered.filter((part) => (part.status || part.status_work) === statusFilter.value);
  }

  // Фильтрация по этапу
  if (stageFilter.value !== "all") {
    filtered = filtered.filter((part) => part.stage === stageFilter.value);
  }

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (part) =>
        part.title?.toLowerCase().includes(query) ||
        part.brand?.toLowerCase().includes(query) ||
        part.material?.toLowerCase().includes(query) ||
        part.profile?.toLowerCase().includes(query) ||
        (part.quantity && part.quantity.toString().includes(query)) ||
        (part.id && part.id.toString().includes(query))
    );
  }

  return filtered;
});

const printAll = async () => {
  try {
    isPrinting.value = true;
    
    const printWindow = window.open('', '_blank');
    const projectName = mainStore.proektSelected?.name || 'Проект';
    
    console.log('Starting print process...');
    console.log('Filtered parts:', filteredParts.value);
    
    // Получаем этапы и подэтапы для каждого элемента и формируем чеки
    const allTickets = [];
    
    for (const part of filteredParts.value) {
      console.log('Processing part:', part.id, part.title);
      try {
        // Получаем этапы для элемента
        const stagesResponse = await axios.get(`/element/${part.id + 1}/stages`);
        console.log('Stages response for part', part.id, ':', stagesResponse.data);
        const stages = stagesResponse.data.stages || [];
        
        // Обрабатываем каждый этап
        for (const stage of stages) {
          console.log('Processing stage:', stage.name, 'for part', part.id);
          if (stage.name === 'Заготовка') {
            // Для этапа "Заготовка" получаем подэтапы и создаем чеки только для них
            try {
              const subStagesResponse = await axios.get(`/blank/${stage.id + 1}/stages`);
              console.log('Substages response for stage', stage.id, ':', subStagesResponse.data);
              const subStages = subStagesResponse.data.stages || [];
              
              for (const subStage of subStages) {
                console.log('Creating ticket for substage:', subStage.name);
                const detailUrl = `${window.location.origin}/worker/stage?projectId=${part.proektId}&elementId=${part.id}&stageId=${stage.id}&subStageId=${subStage.id}`;
                
                const qrDataUrl = await QRCode.toDataURL(detailUrl, {
                  width: 120,
                  margin: 1,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                  }
                });
                
                allTickets.push({
                  ...part,
                  currentStage: subStage.name,
                  stageType: 'подэтап',
                  parentStage: 'Заготовка',
                  qrCode: qrDataUrl
                });
              }
            } catch (subStageError) {
              console.error('Error getting substages for stage:', stage.id, subStageError);
            }
          } else {
            // Для всех остальных этапов создаем обычные чеки
            console.log('Creating ticket for stage:', stage.name);
            const detailUrl = `${window.location.origin}/worker/stage?projectId=${part.proektId}&elementId=${part.id}&stageId=${stage.id}`;
            
            const qrDataUrl = await QRCode.toDataURL(detailUrl, {
              width: 120,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            
            allTickets.push({
              ...part,
              currentStage: stage.name,
              stageType: 'этап',
              qrCode: qrDataUrl
            });
          }
        }
      } catch (error) {
        console.error('Error getting stages for element:', part.id, error);
      }
    }
    
    console.log('All tickets generated:', allTickets);
    console.log('Total tickets count:', allTickets.length);
    
    // Если нет чеков, показываем сообщение и предлагаем создать этапы
    if (allTickets.length === 0) {
      const shouldCreateStages = confirm('Для элементов проекта не найдены этапы. Создать этапы автоматически?');
      if (shouldCreateStages) {
        try {
          const projectId = mainStore.proektSelected?.id;
          console.log('Creating stages for project:', projectId);
          const createResponse = await axios.post(`/proekt/${projectId}/create-stages`);
          console.log('Stages created:', createResponse.data);
          alert('Этапы созданы успешно! Попробуйте печать снова.');
          printWindow.close();
          return;
        } catch (createError) {
          console.error('Error creating stages:', createError);
          alert('Ошибка при создании этапов: ' + createError.message);
        }
      }
      printWindow.close();
      return;
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Печать деталей - ${projectName}</title>
        <style>
          @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css");

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 5px;
            background: white;
            color: #14171F;
            font-weight: 500;
            font-size: 10px;
          }
          .print-container {
            max-width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .wrap-print {
            page-break-inside: avoid;
            margin-bottom: 10px;
            border: 2px solid #000;
            position: relative;
            min-height: 120px;
            width: calc(50% - 5px);
            max-width: 200px;
            box-sizing: border-box;
          }
          .print-item {
            padding-left: 15px;
            border-bottom: 0.92px solid #DFDFDF;
          }

          .wrap-item {
            border-left: 0.92px solid #DFDFDF;
          }

          .h1-text {
            padding: 8px 10px;
            font-size: 12px;
            color: #14171F;
            font-weight: 500;
            border-bottom: 0.92px solid #DFDFDF;
            margin: 0;
          }

          .header-section {
            display: flex;
            justify-content: space-between;
          }

          .contact-info {
            width: 60%;
            display: flex;
            flex-direction: column;
            border-right: 0.92px solid #DFDFDF;
          }

          .info {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
            padding: 8px 8px 8px 0;
            border-bottom: 0.92px solid #DFDFDF;
            color: #14171F;
            font-weight: 500;
            font-size: 8px;
          }

          .empty {
            flex-grow: 1;
          }

          .qr-section {
            height: 90px;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 5px;
          }
          .qr-code img {
            width: 100%;
            height: 100%;
            border: 1px solid #000;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            border-top: 0.92px solid #DFDFDF;
          }

          .left {
            width: 10%;
            padding: 8px;
            border-right: 0.92px solid #DFDFDF;
            text-align: center;
            font-size: 9px;
          }

          .left-qr {
            position: relative;
          }

          .left-qr-text {
            position: absolute;
            transform-origin: top left;
            transform: rotate(-90deg);
            font-size: 12px;
            font-weight: 600;
            top: 50%;
          }

          .right {
            width: 90%;
            padding: 8px;
            text-align: center;
            font-size: 9px;
          }

          .right-qr {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .qr-right {
            flex: 1;
          }

          .right-qr-text {
            height: 100%;
            padding: 8px;
            padding-right: 0;
            border-left: 0.92px solid #DFDFDF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
          }

          .bold {
            font-weight: 700;
            font-size: 11px;
          }
          .name {
            border-top: 0.92px solid #DFDFDF;
            text-align: center;
            padding: 8px;
            font-size: 10px;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 5px;
              background: white;
            }
            .wrap-print {
              page-break-inside: avoid;
              margin-bottom: 15px;
              border: 2px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${allTickets.map(ticket => `
            <div class="wrap-print">
              <h1 class="h1-text">Металл трекер</h1>
              <div class="print-item">
                <div class="wrap-item">
                  <div class="header-section">
                    <div class="contact-info">
                      <div class="info">
                        <div>mail@mail.ru</div>
                        <div>+7 900 000 00 00</div>
                        <div>www.website.ru</div>
                      </div>
                      <div class="empty"></div>
                    </div>
                    
                    <div class="qr-section">
                      <div class="qr-code">
                        <img src="${ticket.qrCode}" alt="QR Code" style="width: 90px; height: 90px;">
                      </div>
                    </div>
                  </div>
                  
                  <div class="info-item">
                    <div class="left">
                      ${ticket.quantity || ''}
                    </div>
                    <div class="right">
                      ${ticket.material || 'Материал не указан'}
                    </div>
                  </div>
                  
                  <div class="info-item">
                    <div class="left"></div>
                    <div class="right">
                      ${ticket.profile || 'Профиль не указан'}
                    </div>
                  </div>
                  
                  <div class="info-item">
                    <div class="left">
                      ${ticket.quantity || 0} (${ticket.techCards && ticket.techCards.length > 0 ? ticket.techCards.reduce((sum, tc) => sum + (tc.quantity || 0), 0) : ticket.quantity || 0})
                    </div>
                    <div class="right bold">
                      ${ticket.brand || 'Марка не указана'}
                    </div>
                  </div>
                  
                  <div class="info-item">
                    <div class="left left-qr">
                      <p class="left-qr-text">№${ticket.id || ''}</p>
                    </div>
                    <div class="right right-qr">
                      <div class="qr-section qr-right">
                        <div class="qr-code">
                          <img src="${ticket.qrCode}" alt="QR Code" style="width: 90px; height: 90px;">
                        </div>
                      </div>
                      <div class="right-qr-text">
                        ${ticket.netWeightSingle || ticket.weightNetSingle || '0.00'}
                      </div>
                    </div>
                  </div>
                  
                  <div class="name">
                    ${ticket.title || 'Название не указано'} - ${ticket.stageType === 'подэтап' ? 
                      `Подэтап "${ticket.currentStage}" (${ticket.parentStage})` : 
                      `Этап "${ticket.currentStage}"`}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => {
              window.close();
            }, 100);
          }
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing:', error);
    alert('Произошла ошибка при печати');
  } finally {
    isPrinting.value = false;
  }
};

const printSingle = async (part) => {
  try {
    const printWindow = window.open('', '_blank');
    const projectName = mainStore.proektSelected?.name || 'Проект';
    
    // Получаем этапы для выбранного элемента и формируем чеки
    const tickets = [];
    
    try {
      // Получаем этапы для элемента
      const stagesResponse = await axios.get(`/element/${part.id + 1}/stages`);
      const stages = stagesResponse.data.stages || [];
      
      // Обрабатываем каждый этап
      for (const stage of stages) {
        if (stage.name === 'Заготовка') {
          // Для этапа "Заготовка" получаем подэтапы и создаем чеки только для них
          try {
            const subStagesResponse = await axios.get(`/blank/${stage.id + 1}/stages`);
            const subStages = subStagesResponse.data.stages || [];
            
            for (const subStage of subStages) {
              const detailUrl = `${window.location.origin}/worker/stage?projectId=${part.proektId}&elementId=${part.id}&stageId=${stage.id}&subStageId=${subStage.id}`;
              
              const qrDataUrl = await QRCode.toDataURL(detailUrl, {
                width: 120,
                margin: 1,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });
              
              tickets.push({
                ...part,
                currentStage: subStage.name,
                stageType: 'подэтап',
                parentStage: 'Заготовка',
                qrCode: qrDataUrl
              });
            }
          } catch (subStageError) {
            console.error('Error getting substages for stage:', stage.id, subStageError);
          }
        } else {
          // Для всех остальных этапов создаем обычные чеки
          const detailUrl = `${window.location.origin}/worker/stage?projectId=${part.proektId}&elementId=${part.id}&stageId=${stage.id}`;
          
          const qrDataUrl = await QRCode.toDataURL(detailUrl, {
            width: 120,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          tickets.push({
            ...part,
            currentStage: stage.name,
            stageType: 'этап',
            qrCode: qrDataUrl
          });
        }
      }
    } catch (error) {
      console.error('Error getting stages for element:', part.id, error);
    }
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Печать этапов - ${part.title || 'Элемент'}</title>
          <style>
            @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css");

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 5px;
              background: white;
              color: #14171F;
              font-weight: 500;
              font-size: 10px;
            }
            .print-container {
              max-width: 100%;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .wrap-print {
              page-break-inside: avoid;
              margin-bottom: 10px;
              border: 2px solid #000;
              position: relative;
              min-height: 120px;
              width: calc(50% - 5px);
              max-width: 200px;
              box-sizing: border-box;
            }
            .print-item {
              padding-left: 15px;
              border-bottom: 0.92px solid #DFDFDF;
            }

            .wrap-item {
              border-left: 0.92px solid #DFDFDF;
            }

            .h1-text {
              padding: 8px 10px;
              font-size: 12px;
              color: #14171F;
              font-weight: 500;
              border-bottom: 0.92px solid #DFDFDF;
              margin: 0;
            }

            .header-section {
              display: flex;
              justify-content: space-between;
            }

            .contact-info {
              width: 60%;
              display: flex;
              flex-direction: column;
              border-right: 0.92px solid #DFDFDF;
            }

            .info {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 4px;
              padding: 8px 8px 8px 0;
              border-bottom: 0.92px solid #DFDFDF;
              color: #14171F;
              font-weight: 500;
              font-size: 8px;
            }

            .empty {
              flex-grow: 1;
            }

            .qr-section {
              height: 90px;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 5px;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
              border: 1px solid #000;
            }

            .info-item {
              display: flex;
              justify-content: space-between;
              border-top: 0.92px solid #DFDFDF;
            }

            .left {
              width: 10%;
              padding: 8px;
              border-right: 0.92px solid #DFDFDF;
              text-align: center;
              font-size: 9px;
            }

            .left-qr {
              position: relative;
            }

            .left-qr-text {
              position: absolute;
              transform-origin: top left;
              transform: rotate(-90deg);
              font-size: 12px;
              font-weight: 600;
              top: 50%;
            }

            .right {
              width: 90%;
              padding: 8px;
              text-align: center;
              font-size: 9px;
            }

            .right-qr {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .qr-right {
              flex: 1;
            }

            .right-qr-text {
              height: 100%;
              padding: 8px;
              padding-right: 0;
              border-left: 0.92px solid #DFDFDF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
            }

            .bold {
              font-weight: 700;
              font-size: 11px;
            }
            .name {
              border-top: 0.92px solid #DFDFDF;
              text-align: center;
              padding: 8px;
              font-size: 10px;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 5px;
                background: white;
              }
              .wrap-print {
                page-break-inside: avoid;
                margin-bottom: 15px;
                border: 2px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${tickets.map(ticket => `
              <div class="wrap-print">
                <h1 class="h1-text">Металл трекер</h1>
                <div class="print-item">
                  <div class="wrap-item">
                    <div class="header-section">
                      <div class="contact-info">
                        <div class="info">
                          <div>mail@mail.ru</div>
                          <div>+7 900 000 00 00</div>
                          <div>www.website.ru</div>
                        </div>
                        <div class="empty"></div>
                      </div>
                      
                      <div class="qr-section">
                        <div class="qr-code">
                          <img src="${ticket.qrCode}" alt="QR Code" style="width: 90px; height: 90px;">
                        </div>
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="left">
                        ${ticket.quantity || ''}
                      </div>
                      <div class="right">
                        ${ticket.material || 'Материал не указан'}
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="left"></div>
                      <div class="right">
                        ${ticket.profile || 'Профиль не указан'}
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="left">
                        ${ticket.quantity || 0} (${ticket.techCards && ticket.techCards.length > 0 ? ticket.techCards.reduce((sum, tc) => sum + (tc.quantity || 0), 0) : ticket.quantity || 0})
                      </div>
                      <div class="right bold">
                        ${ticket.brand || 'Марка не указана'}
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="left left-qr">
                        <p class="left-qr-text">№${ticket.id || ''}</p>
                      </div>
                      <div class="right right-qr">
                        <div class="qr-section qr-right">
                          <div class="qr-code">
                            <img src="${ticket.qrCode}" alt="QR Code" style="width: 90px; height: 90px;">
                          </div>
                        </div>
                        <div class="right-qr-text">
                          ${ticket.netWeightSingle || ticket.weightNetSingle || '0.00'}
                        </div>
                      </div>
                    </div>
                    
                    <div class="name">
                      ${ticket.title || 'Название не указано'} - ${ticket.stageType === 'подэтап' ? 
                        `Подэтап "${ticket.currentStage}" (${ticket.parentStage})` : 
                        `Этап "${ticket.currentStage}"`}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 100);
            }
          <\/script>
        </body>
        </html>
      `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing single part:', error);
    alert('Произошла ошибка при печати');
  }
};const viewPartDetails = (partId) => {
  console.log("Смотреть подробнее деталь:", partId);
  router.push({ name: 'stages', query: { id: partId } });
};

// Загрузка данных при монтировании
const loadData = async () => {
  try {
    isLoading.value = true;
    const id = route.query.id
    
    // Устанавливаем текущий проект ID в store
    mainStore.proektId = id;
    console.log('Set proektId to:', id);
    
    // Сначала загружаем проект
    await mainStore.getProekt(id); 
    
    // Затем загружаем элементы для этого проекта
    await mainStore.getElements();
    
    // Загружаем техкарты для проекта
    if (mainStore.proektSelected?.id) {
      await mainStore.getProjectTechCards(mainStore.proektSelected.id);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="parts-page">
    <BackButton/>
    <h1>{{ mainStore.proektSelected?.name || 'Загрузка...' }}</h1>

    <div class="header-actions">
      <div class="filter-section">
        <select v-model="statusFilter" class="filter-select">
          <option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select v-model="stageFilter" class="filter-select">
          <option
            v-for="option in stageOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="right-actions">
        <button 
          class="print-btn" 
          @click="printAll" 
          :disabled="isPrinting || filteredParts.length === 0"
        >
          <span v-if="isPrinting">Генерация QR-кодов...</span>
          <span v-else>Печатать все</span>
        </button>
      </div>
    </div>

    <!-- Поле поиска -->
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Поиск по названию, марке или количеству..." 
        class="search-input"
      >
    </div>

    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="loading">
      Загрузка деталей...
    </div>

    <!-- Сообщение если нет деталей -->
    <div v-else-if="filteredParts.length === 0" class="no-parts">
      Детали не найдены
    </div>

    <!-- Desktop и Mobile View когда есть детали -->
    <template v-else>
      <!-- Desktop View with Blocks -->
      <div class="parts-container desktop-view">
        <div class="parts-header">
          <div class="header-cell">Название детали</div>
          <div class="header-cell">Марка</div>
          <div class="header-cell">Количество</div>
          <div class="header-cell">Материал</div>
          <div class="header-cell">Профиль</div>
          <div class="header-cell">Этап</div>
          <div class="header-cell">Статус</div>
          <div class="header-cell">Техкарта</div>
          <div class="header-cell"></div>
        </div>

        <div 
          v-for="part in filteredParts" 
          :key="part.id" 
          class="part-row"
        >
          <div class="part-cell name-cell" @click="viewPartDetails(part.id)">{{ part.title || 'Без названия' }} {{part.id}}</div>
          <div class="part-cell brand-cell" @click="viewPartDetails(part.id)">{{ part.brand || '-' }}</div>
          <div class="part-cell quantity-cell" @click="viewPartDetails(part.id)">
            {{ part.quantity || 0 }}
            <small v-if="part.hasTechCard && part.aggregatedData" class="quantity-details">
              ({{ part.techCards.length }} поз.)
            </small>
          </div>
          <div class="part-cell material-cell" @click="viewPartDetails(part.id)" :title="part.material">
            <span v-if="part.material">{{ part.material }}</span>
            <span v-else class="no-data">—</span>
            <small v-if="part.hasTechCard && part.aggregatedData?.materials.length > 1" class="count-badge">
              {{ part.aggregatedData.materials.length }}
            </small>
          </div>
          <div class="part-cell profile-cell" @click="viewPartDetails(part.id)" :title="part.profile">
            <span v-if="part.profile">{{ part.profile }}</span>
            <span v-else class="no-data">—</span>
            <small v-if="part.hasTechCard && part.aggregatedData?.profiles.length > 1" class="count-badge">
              {{ part.aggregatedData.profiles.length }}
            </small>
          </div>
          <div class="part-cell stage-cell" @click="viewPartDetails(part.id)">{{ part.stage || 'Не указан' }}</div>
          <div class="part-cell status-cell" @click="viewPartDetails(part.id)">
            <span
              :class="[
                'status-badge',
                getStatusClass(part.status || part.status_work),
              ]"
            >
              {{ part.status || part.status_work || 'Не указан' }}
            </span>
          </div>
          <div class="part-cell techcard-cell" @click="viewPartDetails(part.id)">
            <span :class="part.hasTechCard ? 'has-techcard' : 'no-techcard'">
              {{ part.hasTechCard ? `✓ (${part.techCards.length})` : '—' }}
            </span>
          </div>
          <div class="part-cell arrow-cell">
            <button 
              @click.stop="printSingle(part)" 
              class="print-single-btn"
              title="Печать QR-кода"
            >
              🖨️
            </button>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              @click="viewPartDetails(part.id)"
              style="cursor: pointer; margin-left: 8px;"
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
      <div class="parts-cards mobile-view">
        <div 
          v-for="part in filteredParts" 
          :key="part.id" 
          class="part-card"
          @click="viewPartDetails(part.id)"
        >
          <div class="card-header">
            <h3>{{ part.title || 'Без названия' }}</h3>
            <span
              :class="[
                'status-badge',
                getStatusClass(part.status || part.status_work),
              ]"
            >
              {{ part.status || part.status_work || 'Не указан' }}
            </span>
          </div>

                    <div class="card-content">
            <p class="part-brand">Марка: {{ part.brand || '-' }}</p>
            <p class="part-quantity">
              Количество: {{ part.quantity || 0 }}
              <span v-if="part.hasTechCard && part.aggregatedData" class="quantity-details">
                (из {{ part.techCards.length }} позиций техкарты)
              </span>
            </p>
            <p class="part-material">
              Материал: 
              <span v-if="part.material" class="has-data">{{ part.material }}</span>
              <span v-else class="no-data">не указан</span>
              <span v-if="part.hasTechCard && part.aggregatedData?.materials.length > 1" class="material-count">
                ({{ part.aggregatedData.materials.length }} типов)
              </span>
            </p>
            <p class="part-profile">
              Профиль: 
              <span v-if="part.profile" class="has-data">{{ part.profile }}</span>
              <span v-else class="no-data">не указан</span>
              <span v-if="part.hasTechCard && part.aggregatedData?.profiles.length > 1" class="profile-count">
                ({{ part.aggregatedData.profiles.length }} типов)
              </span>
            </p>
            <p class="part-stage">Этап: {{ part.stage || 'Не указан' }}</p>
            <p class="part-techcard">
              Техкарта: 
              <span :class="part.hasTechCard ? 'has-techcard' : 'no-techcard'">
                {{ part.hasTechCard ? `Да (${part.techCards.length} позиций)` : 'Нет' }}
              </span>
            </p>
            
            <!-- Дополнительная информация если есть техкарты -->
            <div v-if="part.hasTechCard && part.aggregatedData" class="tech-summary">
              <details class="tech-details">
                <summary>Детали из техкарты</summary>
                <div class="tech-details-content">
                  <p v-if="part.aggregatedData.totalNetWeight > 0">
                    <strong>Общий вес:</strong> {{ part.aggregatedData.totalNetWeight.toFixed(2) }} кг
                  </p>
                  <p v-if="part.aggregatedData.shippingMarks.length > 0">
                    <strong>Отправочные марки:</strong> {{ part.aggregatedData.shippingMarks.join(', ') }}
                  </p>
                  <p v-if="part.aggregatedData.partPositions.length > 0">
                    <strong>Позиции:</strong> {{ part.aggregatedData.partPositions.join(', ') }}
                  </p>
                </div>
              </details>
            </div>

            <div class="card-actions">
              <button class="action-btn view-details-btn">
                Смотреть подробнее
              </button>
              <button
                class="action-btn print-btn"
                @click.stop="printSingle(part)"
                :disabled="isPrinting"
                title="Печать QR-кода"
              >
                🖨️ Печать
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Стили остаются без изменений */
.parts-page {
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

.filter-section {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #F1F2F4;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background: #F8F9FC;
  cursor: pointer;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #1233ea;
}

.right-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sort-btn,
.print-btn {
  padding: 17.5px 24px;
  background-color: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
}

.print-btn span {
  color: white;
  font-size: 14px;
  font-weight: 500;
}
.sort-btn {
  color: #8c93a6;
}

.sort-btn:hover {
  background-color: #f8f9fa;
}

.print-btn {
  background-color: #1233ea;
  color: white;
}

.print-btn:hover {
  background-color: #0f2ac5;
}

.print-btn:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
}

.print-btn:disabled:hover {
  background-color: #cccccc;
}

.search-box {
  width: 100%;
  max-width: 400px;
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

.no-parts {
  text-align: center;
  padding: 40px;
  color: #8c93a6;
  font-size: 16px;
}

/* Parts Container with Blocks */
.parts-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Убираем overflow: hidden чтобы разрешить прокрутку */
}

.parts-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr 80px;
  gap: 20px;
  padding: 20px;
}

.header-cell {
  color: #8c93a6;
  font-weight: 500;
  font-size: 14px;
}

.part-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1.5fr 1.5fr 1fr 1fr 1fr 80px;
  gap: 20px;
  align-items: center;
  padding: 20px;
  border: 1px solid #f1f2f4;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.part-row:hover {
  background-color: #f8f9fb;
}

.part-cell {
  color: #000;
  font-size: 14px;
  position: relative;
}

.part-cell .no-data {
  color: #ccc;
}

.count-badge {
  background: #1233ea;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 10px;
  margin-left: 4px;
  font-weight: 500;
}

.quantity-details {
  display: block;
  font-size: 10px;
  color: #666;
  font-weight: normal;
}

.material-cell,
.profile-cell {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-cell {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.techcard-cell .has-techcard {
  color: #28a745;
  font-weight: 500;
}

.techcard-cell .no-techcard {
  color: #6c757d;
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

/* Mobile Cards */
.parts-cards {
  display: none;
}

.part-card {
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

.part-brand,
.part-quantity,
.part-material,
.part-profile,
.part-stage,
.part-techcard {
  color: #666;
  margin-bottom: 8px;
}

.part-techcard .has-techcard {
  color: #28a745;
  font-weight: 500;
}

.part-techcard .no-techcard {
  color: #6c757d;
}

.has-data {
  color: #000;
  font-weight: 500;
}

.no-data {
  color: #999;
  font-style: italic;
}

.quantity-details,
.material-count,
.profile-count {
  font-size: 11px;
  color: #666;
  font-weight: normal;
}

.tech-summary {
  margin-top: 12px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.tech-details {
  font-size: 12px;
}

.tech-details summary {
  cursor: pointer;
  color: #1233ea;
  font-weight: 500;
  margin-bottom: 8px;
}

.tech-details-content {
  padding-left: 12px;
  margin-top: 8px;
}

.tech-details-content p {
  margin: 4px 0;
  font-size: 11px;
  color: #666;
}

.tech-details-content strong {
  color: #333;
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

.action-btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
}

.card-actions .print-btn {
  background: #28a745;
  color: white;
}

.card-actions .print-btn:hover {
  background: #218838;
}

.card-actions .print-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .parts-page {
    padding: 20px;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-select {
    width: 100%;
  }

  .right-actions {
    justify-content: center;
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