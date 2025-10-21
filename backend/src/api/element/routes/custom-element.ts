
export default {
  routes: [
        {
      method: "GET",
      path: "/proekt/:id/elements",
      handler: "element.getProjectElements",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/element/:id",
      handler: "element.getElementById",
      config: {
        policies: [],
      },
    },
  ],
};