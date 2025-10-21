'use strict';

module.exports = {
  async globalSearch(ctx) {
    try {
      const { query, limit = 10 } = ctx.request.query;
      
      if (!query || query.trim().length < 2) {
        return ctx.badRequest('Поисковый запрос должен содержать минимум 2 символа');
      }
      
      const searchTerm = query.trim();
      console.log('Global search for:', searchTerm);
      
      const results = {
        projects: [],
        elements: [],
        stages: [],
        total: 0
      };
      
      // Поиск по проектам
      try {
        const projects = await strapi.entityService.findMany('api::proekt.proekt', {
          filters: {
            name: {
              $containsi: searchTerm
            }
          },
          fields: ['id', 'name', 'status_work', 'hasTechCard'],
          limit: parseInt(limit)
        });
        
        results.projects = projects.map(project => ({
          id: project.id,
          name: project.name,
          status: project.status_work,
          hasTechCard: project.hasTechCard,
          type: 'project'
        }));
      } catch (error) {
        console.error('Error searching projects:', error);
      }
      
      // Поиск по элементам
      try {
        const elements = await strapi.entityService.findMany('api::element.element', {
          filters: {
            $or: [
              { title: { $containsi: searchTerm } },
              { brand: { $containsi: searchTerm } }
            ]
          },
          fields: ['id', 'title', 'brand', 'proektId'],
          limit: parseInt(limit)
        });
        
        results.elements = elements.map(element => ({
          id: element.id,
          title: element.title,
          brand: element.brand,
          projectId: element.proektId,
          type: 'element'
        }));
      } catch (error) {
        console.error('Error searching elements:', error);
      }

      // Поиск по этапам
      try {
        const stages = await strapi.entityService.findMany('api::etap.etap', {
          filters: {
            name: {
              $containsi: searchTerm
            }
          },
          fields: ['id', 'name', 'elementId'],
          limit: parseInt(limit)
        });
        
        results.stages = stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          elementId: stage.elementId,
          type: 'stage'
        }));
      } catch (error) {
        console.error('Error searching stages:', error);
      }
      
      results.total = results.projects.length + results.elements.length + 
                     results.stages.length;
      
      console.log(`Search completed. Found ${results.total} results`);
      
      return ctx.send({
        query: searchTerm,
        results: results,
        total: results.total
      });
      
    } catch (error) {
      console.error('Error in global search:', error);
      return ctx.internalServerError('Ошибка при выполнении поиска: ' + error.message);
    }
  }
};