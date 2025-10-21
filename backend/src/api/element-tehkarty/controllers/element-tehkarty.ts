'use strict';

namespace ElementTehkartyController {
  export const fs = require('fs');
  export const path = require('path');
  export const excelParser = require(path.join(process.cwd(), 'src/utils/excelParser.js'));
}

module.exports = {
  async createTechCardsFromExcel(ctx) {
    try {
      console.log('Received request to create tech cards from Excel');
      
      const { files, query } = ctx.request;
      const { proektId, isReplacing } = query;
      
      console.log('Files received:', files);
      console.log('Query parameters:', query);
      console.log('isReplacing value:', isReplacing, 'type:', typeof isReplacing);
      
      if (!files || !files.excel) {
        console.log('No Excel file in request');
        return ctx.badRequest('No Excel file uploaded');
      }

      if (!proektId) {
        console.log('No project ID in request');
        return ctx.badRequest('Project ID is required');
      }
      
      // Если это замена техкарты, удаляем старые элементы
      if (isReplacing === 'true' || isReplacing === true) {
        console.log(`Replacing tech card for project ${proektId}. Deleting old elements...`);
        
        // Находим все элементы техкарты для данного проекта
        const elementsToDelete = await strapi.entityService.findMany('api::element-tehkarty.element-tehkarty', {
          filters: {
            proektId: proektId.toString()
          }
        });
        
        console.log(`Found ${elementsToDelete.length} tech card elements to delete`);
        
        // Удаляем каждый элемент
        for (const element of elementsToDelete) {
          await strapi.entityService.delete('api::element-tehkarty.element-tehkarty', element.id);
        }
        
        console.log(`Deleted all old tech card elements for project ${proektId}`);
      }

      const fileBuffer = ElementTehkartyController.fs.readFileSync(files.excel.filepath);
      console.log('File buffer length:', fileBuffer.length);

      // Парсим Excel файл с техкартами
      const data = await ElementTehkartyController.excelParser.parseTechCardExcel(fileBuffer);
      console.log('Parsed tech card data:', {
        techCardsCount: data.techCards.length,
        firstCard: data.techCards[0]
      });

      // Получаем все элементы проекта для справки (используем proektId - 1)
      const allProjectElements = await strapi.entityService.findMany('api::element.element', {
        filters: {
          proektId: (Number(proektId) - 1).toString()
        },
        fields: ['id', 'title', 'brand', 'proektId']
      });
      
      console.log(`Project ${proektId} has ${allProjectElements.length} elements:`, 
        allProjectElements.map(el => ({ id: el.id, title: el.title, brand: el.brand }))
      );

      // Проверяем существование проекта
      const project = await strapi.entityService.findOne('api::proekt.proekt', proektId, {
        fields: ['id', 'name']
      });

      if (!project) {
        return ctx.badRequest(`Project with ID "${proektId}" not found`);
      }

      console.log('Found project:', project);

      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Обрабатываем каждую запись из техкарты
      for (const techCard of data.techCards) {
        try {
          console.log('Processing tech card:', {
            markName: techCard.markName,
            shippingMark: techCard.shippingMark,
            material: techCard.material,
            partPosition: techCard.partPosition
          });

          // Пропускаем записи без материала
          if (!techCard.material || techCard.material.toString().trim() === '') {
            console.log(`Skipping tech card without material: ${techCard.markName}`);
            skippedCount++;
            continue;
          }

          console.log(`Processing tech card with material: ${techCard.material}`);

          // Разделяем markName на title и brand для поиска элементов
          const splitMarkName = (markName) => {
            if (!markName) {
              return { title: '', brand: '' };
            }
            const markNameStr = markName.toString().trim();
            console.log(`Splitting markName: "${markNameStr}"`);
            
            const parts = markNameStr.split(' ');
            console.log(`Split parts:`, parts);
            
            if (parts.length >= 2) {
              const title = parts[0]; // "Балка"
              const brand = parts.slice(1).join(' '); // "Б1-1"
              console.log(`Result: title="${title}", brand="${brand}"`);
              return { title, brand };
            } else {
              console.log(`Single part result: title="${markNameStr}", brand=""`);
              return { title: markNameStr, brand: '' };
            }
          };

          const { title, brand } = splitMarkName(techCard.markName);
          
          console.log(`Searching for element with:`, {
            title: title,
            brand: brand,
            proektId: proektId.toString(),
            originalMarkName: techCard.markName
          });

          // Ищем элемент по title и brand и projectId (используем proektId - 1)
          let elements = await strapi.entityService.findMany('api::element.element', {
            filters: {
              title: title,      // "Балка"
              brand: brand,      // "Б1-1" 
              proektId: proektId.toString() // Используем proektId - 1
            },
            fields: ['id', 'title', 'brand', 'proektId']
          });

          console.log(`Search with proektId as string "${(Number(proektId) - 1).toString()}" found:`, elements.length, 'elements');

          console.log(`Search result:`, elements);

          let elementId = null;
          
          if (elements && elements.length > 0) {
            elementId = elements[0].id.toString();
            console.log(`Found element for tech card ${techCard.markName}:`, elementId);
          } else {
            console.log(`Element not found for tech card: ${techCard.markName} in project ${proektId}`);
            
            // Попробуем найти элементы в проекте для отладки (используем proektId - 1)
            const allProjectElements = await strapi.entityService.findMany('api::element.element', {
              filters: {
                proektId: proektId.toString()
              },
              fields: ['id', 'title', 'brand', 'proektId']
            });
            
            console.log(`All elements in project ${proektId}:`, allProjectElements);
            
            // НЕ создаем новый элемент - техкарты должны привязываться только к существующим элементам
            console.log(`Element not found for tech card: ${techCard.markName}. Skipping tech card creation.`);
            errors.push({
              techCard: techCard.markName,
              error: `Element not found with title="${title}" and brand="${brand}" in project ${proektId}`
            });
            continue; // Пропускаем эту техкарту
          }

          // Подготавливаем данные элемента техкарты
          const techCardData: any = {
            proektId: proektId.toString(),
            shippingMark: techCard.shippingMark,
            markName: techCard.markName,
            title: techCard.title,
            brand: techCard.brand,
            partPosition: techCard.partPosition,
            material: techCard.material,
            quantity: techCard.quantity,
            profile: techCard.profile,
            length: techCard.length,
            width: techCard.width,
            height: techCard.height,
            flangeThickness: techCard.flangeThickness,
            wallThickness: techCard.wallThickness,
            steelGrade: techCard.steelGrade,
            crossSectionArea: techCard.crossSectionArea,
            sectionPerimeter: techCard.sectionPerimeter,
            straightCutLength: techCard.straightCutLength,
            shapedElementsCount: techCard.shapedElementsCount,
            shapedElementsWeight: techCard.shapedElementsWeight,
            netWeightSingle: techCard.netWeightSingle,
            netWeightTotal: techCard.netWeightTotal,
            grossWeightSingle: techCard.grossWeightSingle,
            grossWeightTotal: techCard.grossWeightTotal,
            millingNetWeightSingle: techCard.millingNetWeightSingle,
            millingNetWeightTotal: techCard.millingNetWeightTotal,
            millingGrossWeightSingle: techCard.millingGrossWeightSingle,
            millingGrossWeightTotal: techCard.millingGrossWeightTotal,
            coatingAreaSingle: techCard.coatingAreaSingle,
            coatingAreaTotal: techCard.coatingAreaTotal,
            layoutAreaSingle: techCard.layoutAreaSingle,
            layoutAreaTotal: techCard.layoutAreaTotal,
            paintConsumptionSingle: techCard.paintConsumptionSingle,
            paintConsumptionTotal: techCard.paintConsumptionTotal,
            holeDiameter: techCard.holeDiameter,
            holesPerPart: techCard.holesPerPart,
            holesTotal: techCard.holesTotal,
            removedVolumeSingle: techCard.removedVolumeSingle,
            removedVolumeTotal: techCard.removedVolumeTotal,
            publishedAt: new Date(),
          };

          // Добавляем elementId только если элемент найден
          if (elementId) {
            techCardData.elementId = elementId.toString(); // Явно конвертируем в строку
            console.log(`Setting elementId as string: "${elementId.toString()}"`);
          }

          // Удаляем пустые поля
          Object.keys(techCardData).forEach(key => {
            if (techCardData[key] === null || techCardData[key] === undefined || techCardData[key] === '') {
              delete techCardData[key];
            }
          });

          console.log('Creating tech card element for:', techCard.markName);

          // Используем правильное имя API
          const createdTechCard = await strapi.entityService.create('api::element-tehkarty.element-tehkarty', {
            data: techCardData,
          });

          console.log(`Tech card element created successfully:`, createdTechCard.id);
          createdCount++;

        } catch (techCardError) {
          console.error('Error creating tech card element:', techCard.markName, 'Error:', techCardError);
          
          // Добавляем детальную информацию об ошибках валидации
          if (techCardError.details && techCardError.details.errors) {
            console.error('Validation errors details:', techCardError.details.errors);
            techCardError.details.errors.forEach((error, index) => {
              console.error(`Validation error ${index + 1}:`, error);
            });
          }
          
          errors.push({
            techCard: techCard.markName,
            error: techCardError.message
          });
        }
      }

      console.log(`Successfully created ${createdCount} tech card elements`);
      
      if (errors.length > 0) {
        console.log('Errors during tech card creation:', errors);
      }
      
      // Обновляем проект, устанавливая флаг hasTechCard
      await strapi.entityService.update('api::proekt.proekt', proektId, {
        data: {
          hasTechCard: true
        }
      });
      
      console.log(`Updated project ${proektId} with hasTechCard = true`);

      return ctx.send({ 
        message: `Created ${createdCount} tech card elements for project "${project.name}". Skipped ${skippedCount} elements without material.`, 
        project: {
          id: project.id,
          name: project.name,
        },
        techCardsCreated: createdCount,
        techCardsSkipped: skippedCount,
        totalProcessed: createdCount + skippedCount,
        errors: errors
      });

    } catch (error) {
      console.error('Full error in createTechCardsFromExcel:', error);
      return ctx.internalServerError('Error processing tech card Excel file: ' + error.message);
    }
  },

  async getTechCardsByProject(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!projectId) {
        return ctx.badRequest('Project ID is required');
      }

      const techCards = await strapi.entityService.findMany('api::element-tehkarty.element-tehkarty', {
        filters: {
          proektId: projectId
        }
      });

      return ctx.send({
        techCards: techCards,
        count: techCards.length
      });

    } catch (error) {
      console.error('Error getting tech cards by project:', error);
      return ctx.internalServerError('Error getting tech cards: ' + error.message);
    }
  },

  async getTechCardsByElement(ctx) {
    try {
      const { elementId } = ctx.params;

      if (!elementId) {
        return ctx.badRequest('Element ID is required');
      }

      console.log(`Getting tech cards for element: ${elementId}`);

      const techCards = await strapi.entityService.findMany('api::element-tehkarty.element-tehkarty', {
        filters: {
          $or: [
            { elementId: elementId },
            { elementId: elementId.toString() },
            { elementId: parseInt(elementId) }
          ]
        },
        sort: { partPosition: 'asc' }
      });

      console.log(`Found ${techCards.length} tech cards for element ${elementId}`);
      
      // Для отладки покажем все техкарты в проекте
      if (techCards.length === 0) {
        const allTechCards = await strapi.entityService.findMany('api::element-tehkarty.element-tehkarty', {
          fields: ['id', 'markName', 'elementId', 'proektId'],
          limit: 50
        });
        
        console.log(`All tech cards in database:`, allTechCards.map(tc => ({
          id: tc.id,
          markName: tc.markName,
          elementId: tc.elementId,
          proektId: tc.proektId
        })));
      }

      return ctx.send({
        techCards: techCards,
        count: techCards.length
      });

    } catch (error) {
      console.error('Error getting tech cards by element:', error);
      return ctx.internalServerError('Error getting tech cards: ' + error.message);
    }
  },

  async deleteTechCardsByProject(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!projectId) {
        return ctx.badRequest('Project ID is required');
      }

      // Находим все элементы техкарты проекта
      const techCards = await strapi.entityService.findMany('api::element-tehkarty.element-tehkarty', {
        filters: {
          proektId: projectId
        },
        fields: ['id']
      });

      let deletedCount = 0;

      // Удаляем каждый элемент
      for (const techCard of techCards) {
        await strapi.entityService.delete('api::element-tehkarty.element-tehkarty', techCard.id);
        deletedCount++;
      }

      return ctx.send({
        message: `Deleted ${deletedCount} tech card elements for project ${projectId}`,
        deletedCount: deletedCount
      });

    } catch (error) {
      console.error('Error deleting tech cards by project:', error);
      return ctx.internalServerError('Error deleting tech cards: ' + error.message);
    }
  }
};