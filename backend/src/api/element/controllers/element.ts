/**
 * element controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::element.element', ({ strapi }) => ({
  // Метод для получения элементов проекта
  async getProjectElements(ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Project ID is required');
      }

      // Ищем элементы по proektId (используем id - 1, так как элементы создаются с proektId = project.id - 1)
      const elements = await strapi.entityService.findMany('api::element.element', {
        filters: {
          proektId: (Number(id) - 1).toString()
        }
      });

      return ctx.send({
        projectId: id,
        elements: elements,
        count: elements.length
      });

    } catch (error) {
      console.error('Error getting project elements:', error);
      return ctx.internalServerError('Error getting project elements: ' + error.message);
    }
  },
  // Метод для получения одного элемента по ID
  async getElementById(ctx) {
    try {
      const { id } = ctx.params;
      console.log('ID', id);
      

      if (!id) {
        return ctx.badRequest('Element ID is required');
      }

      // Получаем элемент без указания конкретных полей
      const element = await strapi.entityService.findOne('api::element.element', id);

      if (!element) {
        return ctx.notFound('Element not found');
      }

      return ctx.send({
        element: element
      });

    } catch (error) {
      console.error('Error getting element by ID:', error);
      return ctx.internalServerError('Error getting element: ' + error.message);
    }
  },
}));
