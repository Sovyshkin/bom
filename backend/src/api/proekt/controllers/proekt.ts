'use strict';

namespace ProektController {
  export const fs = require('fs');
  export const path = require('path');
  export const excelParser = require(path.join(process.cwd(), 'src/utils/excelParser.js'));
}

module.exports = {
  async createFromExcel(ctx) {
    try {
      console.log('Received request to create from Excel');
      
      const { files } = ctx.request;
      console.log('Files received:', files);
      
      if (!files || !files.excel) {
        console.log('No Excel file in request');
        return ctx.badRequest('No Excel file uploaded');
      }

      console.log('Excel file info:', {
        name: files.excel.name,
        size: files.excel.size,
        type: files.excel.type
      });

      const fileBuffer = ProektController.fs.readFileSync(files.excel.filepath);
      console.log('File buffer length:', fileBuffer.length);

      const data = await ProektController.excelParser.parseExcel(fileBuffer);

      console.log('Parsed data:', {
        projectName: data.projectName,
        elementsCount: data.elements.length
      });

      // Создаем проект
      const project = await strapi.entityService.create('api::proekt.proekt', {
        data: {
          name: data.projectName,
          publishedAt: new Date(),
          status_work: 'В работе'
        },
      });

      console.log('Project created with ID:', project.id);

      // Определяем этапы по порядку
      const stages = [
        { name: 'Наличие', order: 0, status: 'Не начат' },
        { name: 'Заготовка', order: 1, status: 'Не начат' },
        { name: 'Комплектовка', order: 2, status: 'Не начат' },
        { name: 'Сборка', order: 3, status: 'Не начат' },
        { name: 'Сварка', order: 4, status: 'Не начат' },
        { name: 'Покраска', order: 5, status: 'Не начат' },
        { name: 'Отгрузка', order: 6, status: 'Не начат' }
      ];

      // Определяем подэтапы для этапа "Заготовка"
      const zagotovkaSubstages = [
        { name: 'Плазма', order: 0, status: 'Не начат' },
        { name: 'Пила', order: 1, status: 'Не начат' },
        { name: 'Сверление', order: 2, status: 'Не начат' },
        { name: 'Фрезеровка', order: 3, status: 'Не начат' }
      ];

      // Создаем элементы и привязываем их к проекту через proektId
      let createdCount = 0;
      let stagesCreatedCount = 0;
      let substagesCreatedCount = 0;
      const errors = [];

      console.log(`Starting to process ${data.elements.length} elements`);
      console.log('Stages to create for each element:', stages.map(s => s.name));
      console.log('Substages for Заготовка:', zagotovkaSubstages.map(s => s.name));

      for (const element of data.elements) {
        try {
          // Подготавливаем данные элемента
          const elementData = {
            orderNumber: element.orderNumber || '0000',
            title: element.title || 'Без названия',
            stage: 'Наличие',
            brand: element.brand,
            rowAndAxis: element.rowAndAxis,
            dimensions: element.dimensions,
            mainParameter: element.mainParameter,
            number: element.number,
            revision: element.revision,
            quantity: element.quantity,
            weightNetSingle: element.weightNetSingle,
            weightNetTotal: element.weightNetTotal,
            weightWeldingSingle: element.weightWeldingSingle,
            weightWeldingTotal: element.weightWeldingTotal,
            weightTotalSingle: element.weightTotalSingle,
            weightTotalTotal: element.weightTotalTotal,
            coatingType: element.coatingType ? String(element.coatingType) : null,
            ralFinish: element.ralFinish,
            limit: element.limit,
            areaTotalSingle: element.areaTotalSingle,
            areaTotalTotal: element.areaTotalTotal,
            areaUnroundedSingle: element.areaUnroundedSingle,
            areaUnroundedTotal: element.areaUnroundedTotal,
            areaAkzSingle: element.areaAkzSingle,
            areaAkzTotal: element.areaAkzTotal,
            areaFireProtection: element.areaFireProtection,
            areaFireProtectionPrimer: element.areaFireProtectionPrimer,
            mainElementLength: element.mainElementLength,
            weightPerMeter: element.weightPerMeter,
            constructionType: element.constructionType,
            structure: element.structure,
            proektId: (Number(project.id) - 1).toString(), // Сохраняем (ID проекта - 1) как строку
            publishedAt: new Date(),
          };

          // Удаляем пустые поля
          Object.keys(elementData).forEach(key => {
            if (elementData[key] === null || elementData[key] === undefined || elementData[key] === '') {
              delete elementData[key];
            }
          });

          console.log('Creating element with proektId:', Number(project.id) - 1);

          const createdElement = await strapi.entityService.create('api::element.element', {
            data: elementData,
          });

          console.log(`Element created successfully:`, createdElement.id);

          let zagotovkaStageId = null;

          // Создаем этапы для этого элемента
          try {
            for (const stage of stages) {
              const stageData = {
                name: stage.name,
                order: stage.order,
                status: (stage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
                elementId: createdElement.id.toString(), // Используем elementId как строку
                publishedAt: new Date(), // Публикуем сразу
              };

              const createdStage = await strapi.entityService.create('api::etap.etap', {
                data: stageData,
              });

              // Сохраняем ID этапа "Заготовка" для создания подэтапов
              if (stage.name === 'Заготовка') {
                zagotovkaStageId = createdStage.id;
                console.log(`Заготовка stage ID saved: ${zagotovkaStageId} for element ${createdElement.id}`);
              }

              console.log(`Stage "${stage.name}" created for element ${createdElement.id}:`, createdStage.id);
              stagesCreatedCount++;

              // Создаем подэтапы только для этапа "Заготовка"
              if (stage.name === 'Заготовка' && zagotovkaStageId) {
                try {
                  for (const substage of zagotovkaSubstages) {
                    const substageData = {
                      name: substage.name,
                      order: substage.order,
                      status: (substage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
                      stageId: zagotovkaStageId.toString(), // Привязываем к этапу Заготовка
                      publishedAt: new Date(), // Публикуем сразу
                    };

                    const createdSubstage = await strapi.entityService.create('api::etap-zagotovki.etap-zagotovki', {
                      data: substageData,
                    });

                    console.log(`Substage "${substage.name}" created for zagotovka stage ${zagotovkaStageId}:`, createdSubstage.id);
                    substagesCreatedCount++;
                  }
                  console.log(`All substages created for zagotovka stage ${zagotovkaStageId}`);
                } catch (substageError) {
                  console.error(`Error creating substages for zagotovka stage ${zagotovkaStageId}:`, substageError);
                  errors.push({
                    element: element.brand,
                    stage: 'Заготовка',
                    substageError: substageError.message
                  });
                }
              }
            }
            console.log(`All stages created for element ${createdElement.id}`);
          } catch (stageError) {
            console.error(`Error creating stages for element ${createdElement.id}:`, stageError);
            errors.push({
              element: element.brand,
              stageError: stageError.message
            });
          }

          createdCount++;

        } catch (elementError) {
          console.error('Error creating element:', element.brand, 'Error:', elementError);
          errors.push({
            element: element.brand,
            error: elementError.message
          });
        }
      }

      console.log(`\n=== CREATION SUMMARY ===`);
      console.log(`Elements processed: ${data.elements.length}`);
      console.log(`Elements created: ${createdCount}`);
      console.log(`Stages created: ${stagesCreatedCount}`);
      console.log(`Substages created: ${substagesCreatedCount}`);
      console.log(`Expected stages per element: ${stages.length}`);
      console.log(`Expected total stages: ${createdCount * stages.length}`);
      console.log(`Expected substages per Zaготовка: ${zagotovkaSubstages.length}`);
      console.log(`========================\n`);
      
      if (errors.length > 0) {
        console.log('Errors during creation:', errors);
      }

      return ctx.send({ 
        message: `Project "${data.projectName}" created with ${createdCount} elements, ${stagesCreatedCount} stages and ${substagesCreatedCount} substages`, 
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
        },
        elementsCreated: createdCount,
        stagesCreated: stagesCreatedCount,
        substagesCreated: substagesCreatedCount,
        errors: errors
      });

    } catch (error) {
      console.error('Full error in createFromExcel:', error);
      return ctx.internalServerError('Error processing Excel file: ' + error.message);
    }
  },

  // Метод для замены техкарты проекта
  async replaceProjectTechCard(ctx) {
    try {
      console.log('Received request to replace project tech card');
      
      const { id } = ctx.params;
      const { files } = ctx.request;
      
      if (!id) {
        return ctx.badRequest('Project ID is required');
      }
      
      console.log('Project ID:', id);
      console.log('Files received:', files);
      
      if (!files || !files.excel) {
        console.log('No Excel file in request');
        return ctx.badRequest('No Excel file uploaded');
      }

      console.log('Excel file info:', {
        name: files.excel.name,
        size: files.excel.size,
        type: files.excel.type
      });

      // Проверяем, существует ли проект
      const project = await strapi.entityService.findOne('api::proekt.proekt', id);
      if (!project) {
        return ctx.notFound('Project not found');
      }

      console.log('Project found:', project.name);

      // Удаляем все старые элементы, связанные с этим проектом
      console.log('Deleting old elements for project:', id);
      
      // Находим все элементы с данным proektId
      const oldElements = await strapi.entityService.findMany('api::element.element', {
        filters: {
          proektId: id.toString()
        }
      });

      console.log(`Found ${oldElements.length} old elements to delete`);

      // Удаляем все старые элементы и связанные с ними этапы и подэтапы
      for (const element of oldElements) {
        try {
          // Находим все этапы этого элемента
          const stages = await strapi.entityService.findMany('api::etap.etap', {
            filters: {
              elementId: element.id.toString()
            }
          });

          // Удаляем подэтапы для каждого этапа "Заготовка"
          for (const stage of stages) {
            if (stage.name === 'Заготовка') {
              const substages = await strapi.entityService.findMany('api::etap-zagotovki.etap-zagotovki', {
                filters: {
                  stageId: stage.id.toString()
                }
              });

              for (const substage of substages) {
                await strapi.entityService.delete('api::etap-zagotovki.etap-zagotovki', substage.id);
                console.log(`Deleted substage ${substage.id}`);
              }
            }
          }

          // Удаляем все этапы элемента
          for (const stage of stages) {
            await strapi.entityService.delete('api::etap.etap', stage.id);
            console.log(`Deleted stage ${stage.id}`);
          }

          // Удаляем сам элемент
          await strapi.entityService.delete('api::element.element', element.id);
          console.log(`Deleted element ${element.id}`);
        } catch (deleteError) {
          console.error(`Error deleting element ${element.id}:`, deleteError);
        }
      }

      console.log('All old elements deleted successfully');

      // Парсим новый Excel файл
      const fileBuffer = ProektController.fs.readFileSync(files.excel.filepath);
      console.log('File buffer length:', fileBuffer.length);

      const data = await ProektController.excelParser.parseExcel(fileBuffer);

      console.log('Parsed data:', {
        projectName: data.projectName,
        elementsCount: data.elements.length
      });

      // Определяем этапы по порядку
      const stages = [
        { name: 'Наличие', order: 0, status: 'Не начат' },
        { name: 'Заготовка', order: 1, status: 'Не начат' },
        { name: 'Комплектовка', order: 2, status: 'Не начат' },
        { name: 'Сборка', order: 3, status: 'Не начат' },
        { name: 'Сварка', order: 4, status: 'Не начат' },
        { name: 'Покраска', order: 5, status: 'Не начат' },
        { name: 'Отгрузка', order: 6, status: 'Не начат' }
      ];

      // Определяем подэтапы для этапа "Заготовка"
      const zagotovkaSubstages = [
        { name: 'Плазма', order: 0, status: 'Не начат' },
        { name: 'Пила', order: 1, status: 'Не начат' },
        { name: 'Сверление', order: 2, status: 'Не начат' },
        { name: 'Фрезеровка', order: 3, status: 'Не начат' }
      ];

      // Создаем новые элементы и привязываем их к проекту через proektId
      let createdCount = 0;
      let stagesCreatedCount = 0;
      let substagesCreatedCount = 0;
      const errors = [];

      for (const element of data.elements) {
        try {
          // Подготавливаем данные элемента
          const elementData = {
            orderNumber: element.orderNumber || '0000',
            title: element.title || 'Без названия',
            stage: 'Наличие',
            brand: element.brand,
            rowAndAxis: element.rowAndAxis,
            dimensions: element.dimensions,
            mainParameter: element.mainParameter,
            number: element.number,
            revision: element.revision,
            quantity: element.quantity,
            weightNetSingle: element.weightNetSingle,
            weightNetTotal: element.weightNetTotal,
            weightWeldingSingle: element.weightWeldingSingle,
            weightWeldingTotal: element.weightWeldingTotal,
            weightTotalSingle: element.weightTotalSingle,
            weightTotalTotal: element.weightTotalTotal,
            coatingType: element.coatingType ? String(element.coatingType) : null,
            ralFinish: element.ralFinish,
            limit: element.limit,
            areaTotalSingle: element.areaTotalSingle,
            areaTotalTotal: element.areaTotalTotal,
            areaUnroundedSingle: element.areaUnroundedSingle,
            areaUnroundedTotal: element.areaUnroundedTotal,
            areaAkzSingle: element.areaAkzSingle,
            areaAkzTotal: element.areaAkzTotal,
            areaFireProtection: element.areaFireProtection,
            areaFireProtectionPrimer: element.areaFireProtectionPrimer,
            mainElementLength: element.mainElementLength,
            weightPerMeter: element.weightPerMeter,
            constructionType: element.constructionType,
            structure: element.structure,
            proektId: (Number(id) - 1).toString(), // Используем (существующий ID проекта - 1)
            publishedAt: new Date(),
          };

          // Удаляем пустые поля
          Object.keys(elementData).forEach(key => {
            if (elementData[key] === null || elementData[key] === undefined || elementData[key] === '') {
              delete elementData[key];
            }
          });

          console.log('Creating element with proektId:', Number(id) - 1);

          const createdElement = await strapi.entityService.create('api::element.element', {
            data: elementData,
          });

          console.log(`Element created successfully:`, createdElement.id);

          let zagotovkaStageId = null;

          // Создаем этапы для этого элемента
          try {
            for (const stage of stages) {
              const stageData = {
                name: stage.name,
                order: stage.order,
                status: (stage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
                elementId: createdElement.id.toString(),
                publishedAt: new Date(),
              };

              const createdStage = await strapi.entityService.create('api::etap.etap', {
                data: stageData,
              });

              // Сохраняем ID этапа "Заготовка" для создания подэтапов
              if (stage.name === 'Заготовка') {
                zagotovkaStageId = createdStage.id;
                console.log(`Заготовка stage ID saved: ${zagotovkaStageId} for element ${createdElement.id}`);
              }

              console.log(`Stage "${stage.name}" created for element ${createdElement.id}:`, createdStage.id);
              stagesCreatedCount++;

              // Создаем подэтапы только для этапа "Заготовка"
              if (stage.name === 'Заготовка' && zagotovkaStageId) {
                try {
                  for (const substage of zagotovkaSubstages) {
                    const substageData = {
                      name: substage.name,
                      order: substage.order,
                      status: (substage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
                      stageId: zagotovkaStageId.toString(),
                      publishedAt: new Date(),
                    };

                    const createdSubstage = await strapi.entityService.create('api::etap-zagotovki.etap-zagotovki', {
                      data: substageData,
                    });

                    console.log(`Substage "${substage.name}" created for zagotovka stage ${zagotovkaStageId}:`, createdSubstage.id);
                    substagesCreatedCount++;
                  }
                  console.log(`All substages created for zagotovka stage ${zagotovkaStageId}`);
                } catch (substageError) {
                  console.error(`Error creating substages for zagotovka stage ${zagotovkaStageId}:`, substageError);
                  errors.push({
                    element: element.brand,
                    stage: 'Заготовка',
                    substageError: substageError.message
                  });
                }
              }
            }
            console.log(`All stages created for element ${createdElement.id}`);
          } catch (stageError) {
            console.error(`Error creating stages for element ${createdElement.id}:`, stageError);
            errors.push({
              element: element.brand,
              stageError: stageError.message
            });
          }

          createdCount++;

        } catch (elementError) {
          console.error('Error creating element:', element.brand, 'Error:', elementError);
          errors.push({
            element: element.brand,
            error: elementError.message
          });
        }
      }

      console.log(`Successfully replaced tech card: created ${createdCount} elements, ${stagesCreatedCount} stages and ${substagesCreatedCount} substages`);
      
      if (errors.length > 0) {
        console.log('Errors during replacement:', errors);
      }

      return ctx.send({ 
        message: `Tech card for project "${project.name}" successfully replaced with ${createdCount} elements, ${stagesCreatedCount} stages and ${substagesCreatedCount} substages`, 
        project: {
          id: project.id,
          name: project.name,
          updatedAt: new Date(),
        },
        elementsCreated: createdCount,
        stagesCreated: stagesCreatedCount,
        substagesCreated: substagesCreatedCount,
        errors: errors
      });

    } catch (error) {
      console.error('Full error in replaceProjectTechCard:', error);
      return ctx.internalServerError('Error replacing tech card: ' + error.message);
    }
  },

  // Метод для получения всех проектов
  async getAllProjects(ctx) {
    try {
      const projects = await strapi.entityService.findMany('api::proekt.proekt', {
        sort: { createdAt: 'desc' },
        fields: ['id', 'name', 'createdAt', 'updatedAt', 'status_work', 'hasTechCard', 'etap'],
      });

      return ctx.send({
        projects: projects,
        count: projects.length
      });

    } catch (error) {
      console.error('Error getting all projects:', error);
      return ctx.internalServerError('Error getting projects: ' + error.message);
    }
  },

  // Метод для получения проекта по ID
  async getProjectById(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Project ID is required');
      }

      const project = await strapi.entityService.findOne('api::proekt.proekt', id, {
        fields: ['id', 'name', 'createdAt', 'updatedAt', 'status_work', 'hasTechCard'],
      });

      if (!project) {
        return ctx.notFound('Project not found');
      }

      return ctx.send({
        project: project
      });

    } catch (error) {
      console.error('Error getting project by ID:', error);
      return ctx.internalServerError('Error getting project: ' + error.message);
    }
  },

  async createStagesForExistingElements(ctx) {
    try {
      const { projectId } = ctx.params;
      
      if (!projectId) {
        return ctx.badRequest('Project ID is required');
      }

      // Получаем все элементы проекта
      const elements = await strapi.entityService.findMany('api::element.element', {
        filters: {
          proektId: projectId
        }
      });

      if (!elements || elements.length === 0) {
        return ctx.notFound('No elements found for this project');
      }

      // Определяем этапы по порядку
      const stages = [
        { name: 'Наличие', order: 0, status: 'Не начат' },
        { name: 'Заготовка', order: 1, status: 'Не начат' },
        { name: 'Комплектовка', order: 2, status: 'Не начат' },
        { name: 'Сборка', order: 3, status: 'Не начат' },
        { name: 'Сварка', order: 4, status: 'Не начат' },
        { name: 'Покраска', order: 5, status: 'Не начат' },
        { name: 'Отгрузка', order: 6, status: 'Не начат' }
      ];

      // Определяем подэтапы для этапа "Заготовка"
      const zagotovkaSubstages = [
        { name: 'Плазма', order: 0, status: 'Не начат' },
        { name: 'Пила', order: 1, status: 'Не начат' },
        { name: 'Сверление', order: 2, status: 'Не начат' },
        { name: 'Фрезеровка', order: 3, status: 'Не начат' }
      ];

      let createdStagesCount = 0;
      let createdSubstagesCount = 0;
      const errors = [];

      for (const element of elements) {
        try {
          // Проверяем, есть ли уже этапы для этого элемента
          const existingStages = await strapi.entityService.findMany('api::etap.etap', {
            filters: {
              elementId: element.id.toString()
            },
            publicationState: 'preview' // Проверяем как опубликованные, так и неопубликованные записи
          });

          if (existingStages && existingStages.length > 0) {
            console.log(`Element ${element.id} already has stages, skipping...`);
            continue;
          }

          let zagotovkaStageId;

          // Создаем этапы для этого элемента
          for (const stage of stages) {
            const stageData = {
              name: stage.name,
              order: stage.order,
              status: (stage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
              elementId: element.id.toString(),
              publishedAt: new Date(), // Публикуем сразу
            };

            const createdStage = await strapi.entityService.create('api::etap.etap', {
              data: stageData,
            });

            // Сохраняем ID этапа "Заготовка" для создания подэтапов
            if (stage.name === 'Заготовка') {
              zagotovkaStageId = createdStage.id;
            }

            console.log(`Stage "${stage.name}" created for element ${element.id}:`, createdStage.id);
            createdStagesCount++;

            // Создаем подэтапы только для этапа "Заготовка"
            if (stage.name === 'Заготовка' && zagotovkaStageId) {
              try {
                for (const substage of zagotovkaSubstages) {
                  const substageData = {
                    name: substage.name,
                    order: substage.order,
                    status: (substage.status as "Не начат" | "В работе" | "Готов") || "Не начат",
                    stageId: zagotovkaStageId.toString(),
                    publishedAt: new Date(), // Публикуем сразу
                  };

                  const createdSubstage = await strapi.entityService.create('api::etap-zagotovki.etap-zagotovki', {
                    data: substageData,
                  });

                  console.log(`Substage "${substage.name}" created for zagotovka stage ${zagotovkaStageId}:`, createdSubstage.id);
                  createdSubstagesCount++;
                }
              } catch (substageError) {
                console.error(`Error creating substages for zagotovka stage ${zagotovkaStageId}:`, substageError);
                errors.push({
                  element: element.title,
                  substageError: substageError.message
                });
              }
            }
          }

          console.log(`All stages created for element ${element.id}`);

        } catch (stageError) {
          console.error(`Error creating stages for element ${element.id}:`, stageError);
          errors.push({
            element: element.title,
            stageError: stageError.message
          });
        }
      }

      return ctx.send({
        message: `Created ${createdStagesCount} stages and ${createdSubstagesCount} substages for project ${projectId}`,
        createdStagesCount,
        createdSubstagesCount,
        errors: errors.length > 0 ? errors : null
      });

    } catch (error) {
      console.error('Error creating stages for existing elements:', error);
      return ctx.internalServerError('Error creating stages: ' + error.message);
    }
  },
};