const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const { initDatabase, STAGES } = require("./database");
const { initSampleData } = require("./initData");
const { requestLogger } = require("./middleware/requestLogger");
const { errorHandler } = require("./middleware/errorHandler");

const assetRoutes = require("./routes/assetRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const riskRoutes = require("./routes/riskRoutes");

fastify.register(cors, {
  origin: true,
  credentials: true,
});

requestLogger(fastify);
errorHandler(fastify);

initDatabase();
initSampleData();

fastify.register(assetRoutes, { prefix: "/api" });
fastify.register(collaborationRoutes, { prefix: "/api" });
fastify.register(statisticsRoutes, { prefix: "/api" });
fastify.register(riskRoutes, { prefix: "/api/risk" });

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log("后端服务已启动: http://localhost:3001");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

module.exports = { STAGES };
