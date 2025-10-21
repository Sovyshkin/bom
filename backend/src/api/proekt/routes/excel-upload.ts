module.exports = {
  routes: [
    {
      method: "POST",
      path: "/proekt/excel-upload",
      handler: "proekt.createFromExcel",
      config: {
        policies: [],
        middleware: [],
      },
    },
    {
      method: "PUT",
      path: "/proekt/:id/replace-tech-card",
      handler: "proekt.replaceProjectTechCard",
      config: {
        policies: [],
        middleware: [],
      },
    },
    {
      method: "GET",
      path: "/proekts",
      handler: "proekt.getAllProjects",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/proekt/:id",
      handler: "proekt.getProjectById",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/proekt/:projectId/create-stages",
      handler: "proekt.createStagesForExistingElements",
      config: {
        policies: [],
        middleware: [],
      },
    }
  ],
};
