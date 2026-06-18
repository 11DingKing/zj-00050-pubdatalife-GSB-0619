const { statisticsService } = require("../services/todoService");

const statisticsRoutes = async (fastify, options) => {
  fastify.get("/dashboard", async (request, reply) => {
    const result = statisticsService.getDashboard();
    return result;
  });

  fastify.get("/revenue", async (request, reply) => {
    const records = statisticsService.getRevenue();
    return { records };
  });
};

module.exports = statisticsRoutes;
