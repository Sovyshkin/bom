/**
 * etap-zagotovki controller
 */

import { factories } from '@strapi/strapi'

// Функция для обновления статусов родительских элементов
async function updateParentStatuses(subStage) {
  try {
    if (!subStage.stageId) return;

    // Получаем все подэтапы для данного этапа
    const allSubStages = await strapi.entityService.findMany('api::etap-zagotovki.etap-zagotovki', {
      filters: {
        stageId: subStage.stageId
      },
      publicationState: 'preview'
    });

    // Определяем статус этапа на основе статусов подэтапов
    let stageStatus = 'Не начат';
    const inProgressSubStages = allSubStages.filter(s => (s.status || s.status_work) === 'В работе');
    const completedSubStages = allSubStages.filter(s => (s.status || s.status_work) === 'Готов');
    
    if (completedSubStages.length === allSubStages.length) {
      stageStatus = 'Готов';
    } else if (inProgressSubStages.length > 0 || completedSubStages.length > 0) {
      stageStatus = 'В работе';
    }

    // Обновляем статус родительского этапа
    const updatedStage = await strapi.entityService.update('api::etap.etap', subStage.stageId, {
      data: { 
        status: stageStatus,
        status_work: stageStatus 
      } as any
    });

    // Получаем этап чтобы найти элемент
    const stage: any = await strapi.entityService.findOne('api::etap.etap', subStage.stageId);
    if (!stage?.elementId) return;

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
    console.error('Error updating parent statuses from substage:', error);
  }
}

export default factories.createCoreController('api::etap-zagotovki.etap-zagotovki', ({ strapi }) => ({
    async findByStageId(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Stage ID is required');
      }

      const substages = await strapi.entityService.findMany('api::etap-zagotovki.etap-zagotovki', {
        filters: {
          stageId: id
        },
        populate: '*', // добавляем популяцию если нужно
        publicationState: 'preview' // Получаем как опубликованные, так и неопубликованные записи
      });

      return ctx.send({
        stageId: id,
        stages: substages,
        count: substages.length
      });

    } catch (error) {
      console.error('Error getting substages by stageId:', error);
      return ctx.internalServerError('Error getting substages: ' + error.message);
    }
  },

  async getSubStageById(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('SubStage ID is required');
      }

      const subStage = await strapi.entityService.findOne('api::etap-zagotovki.etap-zagotovki', id, {
        populate: '*'
      });

      if (!subStage) {
        return ctx.notFound('SubStage not found');
      }

      return ctx.send({
        subStage: subStage
      });

    } catch (error) {
      console.error('Error getting substage by ID:', error);
      return ctx.internalServerError('Error getting substage: ' + error.message);
    }
  },

  async updateSubStageStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, userId } = ctx.request.body;

      if (!id) {
        return ctx.badRequest('SubStage ID is required');
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

      const updatedSubStage = await strapi.entityService.update('api::etap-zagotovki.etap-zagotovki', id, {
        data: updateData,
        populate: '*'
      });

      if (!updatedSubStage) {
        return ctx.notFound('SubStage not found');
      }

      // Обновляем статусы родительских элементов
      await updateParentStatuses(updatedSubStage);

      return ctx.send({
        subStage: updatedSubStage
      });

    } catch (error) {
      console.error('Error updating substage status:', error);
      return ctx.internalServerError('Error updating substage status: ' + error.message);
    }
  },
}));
