export default {
  routes: [
    {
      method: "GET",
      path: "/blank/:id/stages",
      handler: "etap-zagotovki.findByStageId",
      config: {
        policies: [],
      },
    },
  ],
};
