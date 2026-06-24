export default {
  routes: [
    {
      method: "POST",
      path: "/deals/:id/vote",
      handler: "deal.vote",
    },
  ],
};
