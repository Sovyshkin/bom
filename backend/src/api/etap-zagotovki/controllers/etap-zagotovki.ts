/**
 * etap-zagotovki controller
 */

import { factories } from '@strapi/strapi'

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

      const updatedSubStage = await strapi.entityService.update('api::etap-zagotovki.etap-zagotovki', id, {
        data: updateData,
        populate: '*'
      });

      if (!updatedSubStage) {
        return ctx.notFound('SubStage not found');
      }

      return ctx.send({
        subStage: updatedSubStage
      });

    } catch (error) {
      console.error('Error updating substage status:', error);
      return ctx.internalServerError('Error updating substage status: ' + error.message);
    }
  },
}));
