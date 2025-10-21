/**
 * etap controller
 */

import { factories } from '@strapi/strapi'

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
        populate: '*' // добавляем популяцию всех связанных полей
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

      const updateData: any = { status };
      
      // Если статус меняется на "В работе", записываем пользователя
      if (status === 'В работе' && userId) {
        updateData.startedBy = userId;
        updateData.startedAt = new Date();
      }
      
      // Если статус меняется на "Готов", записываем время завершения
      if (status === 'Готов') {
        updateData.finishedAt = new Date();
        if (userId) {
          updateData.finishedBy = userId;
        }
      }

      const updatedStage = await strapi.entityService.update('api::etap.etap', id, {
        data: updateData,
        populate: '*'
      });

      if (!updatedStage) {
        return ctx.notFound('Stage not found');
      }

      return ctx.send({
        stage: updatedStage
      });

    } catch (error) {
      console.error('Error updating stage status:', error);
      return ctx.internalServerError('Error updating stage status: ' + error.message);
    }
  },
}));
