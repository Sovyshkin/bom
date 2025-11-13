/**
 * etap controller
 */

import { factories } from '@strapi/strapi'

// Функция для обновления статусов родительских элементов
async function updateParentStatuses(stage) {
  try {
    if (!stage.elementId) return;

    // Получаем все этапы для данного элемента
    const allStages = await strapi.entityService.findMany('api::etap.etap', {
      filters: {
        elementId: stage.elementId
      },
      publicationState: 'preview'
    });

    // Определяем статус элемента на основе статусов этапов
    let elementStatus = 'Не начат';
    const inProgressStages = allStages.filter(s => (s.status || s.status_work) === 'В работе');
    const completedStages = allStages.filter(s => (s.status || s.status_work) === 'Готов');
    
    if (completedStages.length === allStages.length) {
      elementStatus = 'Готов';
    } else if (inProgressStages.length > 0 || completedStages.length > 0) {
      elementStatus = 'В работе';
    }

    // Обновляем статус элемента
    await strapi.entityService.update('api::element.element', stage.elementId, {
      data: { status_work: elementStatus } as any
    });

    // Получаем элемент чтобы найти проект
    const element: any = await strapi.entityService.findOne('api::element.element', stage.elementId);
    if (!element?.proektId) return;

    // Получаем все элементы проекта
    const allElements: any[] = await strapi.entityService.findMany('api::element.element', {
      filters: {
        proektId: element.proektId
      },
      publicationState: 'preview'
    });

    // Определяем статус проекта на основе статусов элементов
    let projectStatus = 'Не начат';
    const inProgressElements = allElements.filter(e => e.status_work === 'В работе');
    const completedElements = allElements.filter(e => e.status_work === 'Готов');
    
    if (completedElements.length === allElements.length) {
      projectStatus = 'Готов';
    } else if (inProgressElements.length > 0 || completedElements.length > 0) {
      projectStatus = 'В работе';
    }

    // Обновляем статус проекта
    await strapi.entityService.update('api::proekt.proekt', element.proektId, {
      data: { status_work: projectStatus }
    });

  } catch (error) {
    console.error('Error updating parent statuses:', error);
  }
}

export default factories.createCoreController('api::etap.etap', ({ strapi }) => ({
  async getElementStages(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Element ID is required');
      }

      // Используем elementId для фильтрации
      const stages = await strapi.entityService.findMany('api::etap.etap', {
        filters: {
          elementId: id
        },
        publicationState: 'preview' // Получаем как опубликованные, так и неопубликованные записи
      });

      return ctx.send({
        elementId: id,
        stages: stages,
        count: stages.length
      });

    } catch (error) {
      console.error('Error getting element stages:', error);
      return ctx.internalServerError('Error getting element stages: ' + error.message);
    }
  },
  async getStageById(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Stage ID is required');
      }

      const stage = await strapi.entityService.findOne('api::etap.etap', id, {
        populate: ['startedBy', 'finishedBy']
      });

      if (!stage) {
        return ctx.notFound('Stage not found');
      }

      return ctx.send({
        stage: stage
      });

    } catch (error) {
      console.error('Error getting stage by ID:', error);
      return ctx.internalServerError('Error getting stage: ' + error.message);
    }
  },

  async updateStageStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, userId } = ctx.request.body;

      if (!id) {
        return ctx.badRequest('Stage ID is required');
      }

      if (!status || !['Не начат', 'В работе', 'Готов'].includes(status)) {
        return ctx.badRequest('Valid status is required (Не начат, В работе, Готов)');
      }

      const updateData: any = { 
        status,
        status_work: status // обновляем и старое поле для совместимости
      };
      
      // Если статус меняется на "В работе", записываем пользователя и время начала
      if (status === 'В работе' && userId) {
        const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
        updateData.startedBy = userId;
        updateData.startedAt = new Date();
        updateData.start = new Date(); // для совместимости со старым полем
        
        // Формируем имя пользователя с приоритетом на полное имя
        let userName = 'Неизвестный пользователь';
        if (user?.name && user?.surname) {
          userName = `${user.name} ${user.surname}`;
        } else if (user?.name) {
          userName = user.name;
        } else if (user?.surname) {
          userName = user.surname;
        } else if (user?.username) {
          userName = user.username;
        } else if (user?.email) {
          userName = user.email;
        }
        updateData.who = userName;
      }
      
      // Если статус меняется на "Готов", записываем время завершения
      if (status === 'Готов') {
        updateData.finishedAt = new Date();
        updateData.finish = new Date(); // для совместимости со старым полем
        if (userId) {
          updateData.finishedBy = userId;
        }
      }
      
      // Если статус меняется на "Не начат", очищаем данные о работе
      if (status === 'Не начат') {
        updateData.startedBy = null;
        updateData.finishedBy = null;
        updateData.startedAt = null;
        updateData.finishedAt = null;
        updateData.start = null;
        updateData.finish = null;
        updateData.who = null;
      }

      const updatedStage = await strapi.entityService.update('api::etap.etap', id, {
        data: updateData,
        populate: ['startedBy', 'finishedBy']
      });

      if (!updatedStage) {
        return ctx.notFound('Stage not found');
      }

      // Обновляем статусы родительских элементов
      await updateParentStatuses(updatedStage);

      return ctx.send({
        stage: updatedStage
      });

    } catch (error) {
      console.error('Error updating stage status:', error);
      return ctx.internalServerError('Error updating stage status: ' + error.message);
    }
  },
}));
