const { assetService } = require("../services/assetService");

const assetRoutes = async (fastify, options) => {
  fastify.get("/departments", async (request, reply) => {
    const departments = assetService.getDepartments();
    return { departments };
  });

  fastify.get("/assets", async (request, reply) => {
    const assets = assetService.getAllAssets();
    return { assets };
  });

  fastify.get("/assets/:id", async (request, reply) => {
    const result = assetService.getAssetById(request.params.id);
    return result;
  });

  fastify.post("/assets", async (request, reply) => {
    const result = assetService.createAsset(request.body);
    return result;
  });

  fastify.post("/assets/:id/complete-stage", async (request, reply) => {
    const result = assetService.completeStage(request.params.id, request.body);
    return result;
  });
};

module.exports = assetRoutes;
