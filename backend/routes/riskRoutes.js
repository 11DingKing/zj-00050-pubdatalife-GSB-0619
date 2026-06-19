const { riskService } = require("../services/riskService");

const riskRoutes = async (fastify, options) => {
  fastify.get("/warnings", async (request, reply) => {
    const { dept_id, risk_level, stage, status } = request.query;

    const filters = {};
    if (dept_id) filters.dept_id = dept_id;
    if (risk_level) filters.risk_level = risk_level;
    if (stage) filters.stage = stage;
    if (status) filters.status = status;

    return riskService.getAllRiskWarnings(filters);
  });

  fastify.get(
    "/warnings/:warningId/escalation-logs",
    async (request, reply) => {
      return riskService.getEscalationLogs(request.params.warningId);
    },
  );

  fastify.get("/asset/:assetId", async (request, reply) => {
    const riskInfo = riskService.getAssetRiskInfo(request.params.assetId);
    return riskInfo;
  });

  fastify.post("/warnings/:warningId/handle", async (request, reply) => {
    const { warningId } = request.params;
    const { action_type, remark, operator_id } = request.body;

    const result = riskService.handleWarning(
      warningId,
      action_type,
      remark,
      operator_id,
    );

    return result;
  });

  fastify.post(
    "/warnings/:warningId/submit-rectification",
    async (request, reply) => {
      const { warningId } = request.params;
      const { rectification_result, remark, operator_id } = request.body;

      const result = riskService.submitRectification(
        warningId,
        rectification_result,
        remark,
        operator_id,
      );

      return result;
    },
  );

  fastify.post("/warnings/:warningId/review", async (request, reply) => {
    const { warningId } = request.params;
    const { approved, review_remark, reviewer_id } = request.body;

    const result = riskService.reviewWarning(
      warningId,
      approved,
      review_remark,
      reviewer_id,
    );

    return result;
  });

  fastify.post("/asset/:assetId/recalculate", async (request, reply) => {
    const { assetId } = request.params;

    const asset = require("../database")
      .db.prepare("SELECT * FROM assets WHERE id = ?")
      .get(assetId);
    if (!asset) {
      return reply.code(404).send({ error: "资产不存在" });
    }

    const result = riskService.updateAssetRiskWarning(assetId);

    return {
      success: true,
      message: "风险评分已重新计算",
      risk: result,
    };
  });

  fastify.get("/overview", async (request, reply) => {
    const { dept_id, risk_level, stage, status } = request.query;

    const filters = {};
    if (dept_id) filters.dept_id = dept_id;
    if (risk_level) filters.risk_level = risk_level;
    if (stage) filters.stage = stage;
    if (status) filters.status = status;

    return riskService.getRiskOverview(filters);
  });

  fastify.get("/assets-with-warnings", async (request, reply) => {
    return riskService.getAssetsWithWarnings();
  });
};

module.exports = riskRoutes;
