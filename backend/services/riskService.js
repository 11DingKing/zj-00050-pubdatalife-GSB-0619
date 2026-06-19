const { v4: uuidv4 } = require("uuid");
const { db, STAGES } = require("../database");
const {
  NotFoundError,
  ValidationError,
} = require("../middleware/errorHandler");
const {
  RISK_THRESHOLD,
  RISK_WEIGHTS,
  WARNING_STATUS,
  STAGE_STATUS,
  RISK_LEVEL_ORDER,
  SLA_PENDING_ESCALATION_DAYS,
  REVIEW_STATUS,
} = require("../models");

function calculateOverdueDaysScore(overdueDays) {
  if (overdueDays <= 0) return 100;
  if (overdueDays <= 3) return 80;
  if (overdueDays <= 7) return 60;
  if (overdueDays <= 14) return 40;
  return 20;
}

function calculateStageStuckScore(stuckDays) {
  if (stuckDays <= 3) return 100;
  if (stuckDays <= 7) return 80;
  if (stuckDays <= 14) return 60;
  if (stuckDays <= 21) return 40;
  return 20;
}

function calculateResponseSpeedScore(avgResponseHours) {
  if (avgResponseHours <= 0) return 100;
  if (avgResponseHours <= 24) return 90;
  if (avgResponseHours <= 48) return 70;
  if (avgResponseHours <= 72) return 50;
  return 30;
}

function calculateHistoricalPassRateScore(passRate) {
  if (passRate >= 0.9) return 100;
  if (passRate >= 0.8) return 85;
  if (passRate >= 0.7) return 70;
  if (passRate >= 0.6) return 55;
  return 40;
}

function getRiskLevel(score) {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

function getSuggestedActions(riskLevel, overdueDays, stageStuckDays) {
  const actions = [];

  if (overdueDays > 0) {
    actions.push(`资产已超期 ${overdueDays} 天，建议立即催办`);
  }

  if (stageStuckDays > 7) {
    actions.push(`在当前阶段已停滞 ${stageStuckDays} 天，建议组织协调会推进`);
  }

  if (riskLevel === "high" || riskLevel === "critical") {
    actions.push("风险等级较高，建议重点关注，必要时直接介入推进");
  }

  return actions.join("；");
}

function escalateLevel(level) {
  const idx = RISK_LEVEL_ORDER.indexOf(level);
  if (idx < 0) return level;
  if (idx >= RISK_LEVEL_ORDER.length - 1) return level;
  return RISK_LEVEL_ORDER[idx + 1];
}

function applySlaEscalation(warning) {
  if (!warning) return warning;
  if (warning.status !== WARNING_STATUS.PENDING) return warning;

  const baseLevel = warning.escalated_level || warning.risk_level;
  if (baseLevel === "critical") return warning;

  const baseTimeStr = warning.last_escalated_at || warning.created_at;
  if (!baseTimeStr) return warning;

  const baseTime = new Date(baseTimeStr);
  const now = new Date();
  const elapsedDays = Math.floor((now - baseTime) / (1000 * 60 * 60 * 24));

  if (elapsedDays < SLA_PENDING_ESCALATION_DAYS) return warning;

  const stepCount = Math.floor(elapsedDays / SLA_PENDING_ESCALATION_DAYS);
  let currentLevel = baseLevel;
  let appliedSteps = 0;
  for (let i = 0; i < stepCount; i++) {
    const next = escalateLevel(currentLevel);
    if (next === currentLevel) break;
    currentLevel = next;
    appliedSteps += 1;
  }

  if (appliedSteps === 0) return warning;

  const nowIso = now.toISOString();
  const newCount = (warning.escalation_count || 0) + appliedSteps;

  let priorLevel = warning.escalated_level || warning.risk_level;
  for (let i = 0; i < appliedSteps; i++) {
    const nextLevel = escalateLevel(priorLevel);
    db.prepare(
      `INSERT INTO escalation_logs (id, warning_id, asset_id, from_level, to_level, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uuidv4(),
      warning.id,
      warning.asset_id,
      priorLevel,
      nextLevel,
      `pending 状态超过 ${SLA_PENDING_ESCALATION_DAYS} 天未进入处置，自动升级`,
      nowIso,
    );
    priorLevel = nextLevel;
  }

  db.prepare(
    `UPDATE risk_warnings
     SET escalated_level = ?, escalation_count = ?, last_escalated_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(currentLevel, newCount, nowIso, nowIso, warning.id);

  return {
    ...warning,
    escalated_level: currentLevel,
    escalation_count: newCount,
    last_escalated_at: nowIso,
    updated_at: nowIso,
  };
}

function ensureWarningSla(warningId) {
  const warning = db
    .prepare("SELECT * FROM risk_warnings WHERE id = ?")
    .get(warningId);
  return applySlaEscalation(warning);
}

const riskService = {
  calculateAssetRiskScore(assetId) {
    const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId);
    if (!asset) return null;

    const currentStage = db
      .prepare(
        `
      SELECT * FROM lifecycle_stages 
      WHERE asset_id = ? AND stage_name = ?
    `,
      )
      .get(assetId, asset.current_stage);

    if (!currentStage) return null;

    let overdueDays = 0;
    if (currentStage.deadline) {
      const deadline = new Date(currentStage.deadline);
      const now = new Date();
      overdueDays = Math.max(
        0,
        Math.floor((now - deadline) / (1000 * 60 * 60 * 24)),
      );
    }

    let stageStuckDays = 0;
    if (currentStage.started_at) {
      const startedAt = new Date(currentStage.started_at);
      const now = new Date();
      stageStuckDays = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));
    }

    const collaborations = db
      .prepare(
        `
      SELECT * FROM collaboration_records 
      WHERE asset_id = ? 
      ORDER BY created_at DESC
      LIMIT 5
    `,
      )
      .all(assetId);

    let avgResponseHours = 0;
    if (collaborations.length > 0) {
      const totalHours = collaborations.reduce((sum, collab) => {
        const todo = db
          .prepare(
            `
          SELECT created_at FROM todo_items 
          WHERE asset_id = ? AND stage_name = ?
        `,
          )
          .get(assetId, collab.stage_name);

        if (todo) {
          const todoTime = new Date(todo.created_at);
          const collabTime = new Date(collab.created_at);
          return sum + Math.abs((collabTime - todoTime) / (1000 * 60 * 60));
        }
        return sum;
      }, 0);
      avgResponseHours = totalHours / collaborations.length;
    }

    const completedAssets = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM lifecycle_stages ls
      JOIN assets a ON ls.asset_id = a.id
      WHERE ls.stage_name = ? AND ls.status = 'completed'
    `,
      )
      .get(asset.current_stage);

    const totalAssetsInStage = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM lifecycle_stages ls
      WHERE ls.stage_name = ?
    `,
      )
      .get(asset.current_stage);

    const historicalPassRate =
      totalAssetsInStage.count > 0
        ? completedAssets.count / totalAssetsInStage.count
        : 0.8;

    const overdueScore = calculateOverdueDaysScore(overdueDays);
    const stageStuckScore = calculateStageStuckScore(stageStuckDays);
    const responseSpeedScore = calculateResponseSpeedScore(avgResponseHours);
    const historicalScore =
      calculateHistoricalPassRateScore(historicalPassRate);

    const totalScore =
      overdueScore * RISK_WEIGHTS.overdueDays +
      stageStuckScore * RISK_WEIGHTS.stageStuckDays +
      responseSpeedScore * RISK_WEIGHTS.responseSpeed +
      historicalScore * RISK_WEIGHTS.historicalPassRate;

    const riskLevel = getRiskLevel(totalScore);

    return {
      assetId,
      riskScore: Math.round(totalScore * 100) / 100,
      riskLevel,
      overdueDays,
      stageStuckDays,
      responseSpeedScore,
      historicalPassRate: Math.round(historicalPassRate * 100) / 100,
      suggestedActions: getSuggestedActions(
        riskLevel,
        overdueDays,
        stageStuckDays,
      ),
      dimensionScores: {
        overdueScore,
        stageStuckScore,
        responseSpeedScore,
        historicalScore,
      },
    };
  },

  updateAssetRiskWarning(assetId) {
    const riskData = this.calculateAssetRiskScore(assetId);
    if (!riskData) return null;

    const existingWarning = db
      .prepare(
        `
      SELECT * FROM risk_warnings 
      WHERE asset_id = ? AND status IN ('pending', 'handling', 'reviewing')
      ORDER BY created_at DESC
      LIMIT 1
    `,
      )
      .get(assetId);

    const now = new Date().toISOString();

    if (riskData.riskScore < RISK_THRESHOLD) {
      if (existingWarning) {
        db.prepare(
          `
          UPDATE risk_warnings 
          SET risk_score = ?, risk_level = ?, overdue_days = ?, 
              stage_stuck_days = ?, response_speed_score = ?, 
              historical_pass_rate = ?, suggested_actions = ?, updated_at = ?
          WHERE id = ?
        `,
        ).run(
          riskData.riskScore,
          riskData.riskLevel,
          riskData.overdueDays,
          riskData.stageStuckDays,
          riskData.responseSpeedScore,
          riskData.historicalPassRate,
          riskData.suggestedActions,
          now,
          existingWarning.id,
        );
        return { ...riskData, warningId: existingWarning.id };
      } else {
        const warningId = uuidv4();
        db.prepare(
          `
          INSERT INTO risk_warnings (
            id, asset_id, risk_score, risk_level, overdue_days, 
            stage_stuck_days, response_speed_score, historical_pass_rate, 
            status, suggested_actions, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          warningId,
          assetId,
          riskData.riskScore,
          riskData.riskLevel,
          riskData.overdueDays,
          riskData.stageStuckDays,
          riskData.responseSpeedScore,
          riskData.historicalPassRate,
          WARNING_STATUS.PENDING,
          riskData.suggestedActions,
          now,
          now,
        );
        return { ...riskData, warningId };
      }
    } else {
      if (existingWarning) {
        db.prepare(
          `
          UPDATE risk_warnings 
          SET status = 'resolved', updated_at = ?, handled_at = ?,
              review_status = ?, review_remark = ?
          WHERE id = ?
        `,
        ).run(
          now,
          now,
          REVIEW_STATUS.APPROVED,
          "风险评分回归阈值以上，系统自动闭环",
          existingWarning.id,
        );
      }
      return { ...riskData, warningId: null, isWarning: false };
    }
  },

  handleWarning(
    warningId,
    actionType,
    remark,
    operatorId,
    rectificationResult,
  ) {
    if (!actionType) {
      throw new ValidationError("请指定处置类型");
    }

    const warning = db
      .prepare("SELECT * FROM risk_warnings WHERE id = ?")
      .get(warningId);
    if (!warning) {
      throw new NotFoundError("预警不存在");
    }

    if (warning.status === WARNING_STATUS.RESOLVED) {
      throw new ValidationError("预警已闭环，不能再次处置");
    }

    applySlaEscalation(warning);

    const trimmedResult = (rectificationResult || "").trim();
    if (!trimmedResult) {
      throw new ValidationError("请填写整改结果，处置必须形成闭环");
    }

    const now = new Date().toISOString();

    const recordId = uuidv4();
    db.prepare(
      `
      INSERT INTO handling_records (id, warning_id, asset_id, action_type, remark, operator_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      recordId,
      warningId,
      warning.asset_id,
      actionType,
      remark,
      operatorId || null,
      now,
    );

    if (actionType === "direct_advance") {
      const asset = db
        .prepare("SELECT * FROM assets WHERE id = ?")
        .get(warning.asset_id);
      if (asset && asset.current_stage !== "已完成") {
        const currentStageInfo = STAGES.find(
          (s) => s.name === asset.current_stage,
        );
        const nextStageOrder = currentStageInfo.order + 1;

        if (nextStageOrder <= STAGES.length) {
          const nextStageInfo = STAGES.find((s) => s.order === nextStageOrder);
          db.prepare(
            `
            UPDATE assets 
            SET current_stage = ?, updated_at = ?
            WHERE id = ?
          `,
          ).run(nextStageInfo.name, now, warning.asset_id);

          db.prepare(
            `
            UPDATE lifecycle_stages 
            SET status = 'completed', completed_at = ?
            WHERE asset_id = ? AND stage_name = ?
          `,
          ).run(now, warning.asset_id, asset.current_stage);

          db.prepare(
            `
            UPDATE lifecycle_stages 
            SET status = 'in_progress', started_at = ?
            WHERE asset_id = ? AND stage_order = ?
          `,
          ).run(now, warning.asset_id, nextStageOrder);
        }
      }
    }

    const updatedRisk = this.updateAssetRiskWarning(warning.asset_id);

    db.prepare(
      `
      UPDATE risk_warnings 
      SET status = ?, updated_at = ?, handling_remark = ?,
          rectification_result = ?, review_status = ?, handled_at = ?
      WHERE id = ?
    `,
    ).run(
      WARNING_STATUS.REVIEWING,
      now,
      remark || "",
      trimmedResult,
      REVIEW_STATUS.PENDING,
      now,
      warningId,
    );

    return {
      success: true,
      message: "处置已记录，待复核确认后才会闭环",
      updatedRisk,
      handlingRecordId: recordId,
      reviewStatus: REVIEW_STATUS.PENDING,
    };
  },

  reviewWarning(warningId, decision, reviewRemark, reviewerId) {
    if (!decision) {
      throw new ValidationError("请指定复核结论");
    }
    if (
      decision !== REVIEW_STATUS.APPROVED &&
      decision !== REVIEW_STATUS.REJECTED
    ) {
      throw new ValidationError("复核结论无效");
    }

    const warning = db
      .prepare("SELECT * FROM risk_warnings WHERE id = ?")
      .get(warningId);
    if (!warning) {
      throw new NotFoundError("预警不存在");
    }
    if (warning.status !== WARNING_STATUS.REVIEWING) {
      throw new ValidationError("仅待复核的预警可以复核");
    }
    if (!warning.rectification_result) {
      throw new ValidationError("缺少整改结果，无法复核");
    }

    const now = new Date().toISOString();

    if (decision === REVIEW_STATUS.APPROVED) {
      db.prepare(
        `UPDATE risk_warnings
         SET status = ?, review_status = ?, review_remark = ?,
             reviewed_at = ?, reviewer_id = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        WARNING_STATUS.RESOLVED,
        REVIEW_STATUS.APPROVED,
        reviewRemark || "",
        now,
        reviewerId || null,
        now,
        warningId,
      );
      return {
        success: true,
        message: "复核通过，预警已闭环",
        status: WARNING_STATUS.RESOLVED,
      };
    }

    db.prepare(
      `UPDATE risk_warnings
       SET status = ?, review_status = ?, review_remark = ?,
           reviewed_at = ?, reviewer_id = ?, updated_at = ?,
           rectification_result = NULL
       WHERE id = ?`,
    ).run(
      WARNING_STATUS.PENDING,
      REVIEW_STATUS.REJECTED,
      reviewRemark || "",
      now,
      reviewerId || null,
      now,
      warningId,
    );
    return {
      success: true,
      message: "复核未通过，预警已退回重新处置",
      status: WARNING_STATUS.PENDING,
    };
  },

  getAllRiskWarnings(filters = {}) {
    let query = `
      SELECT rw.*, 
             a.name as asset_name,
             a.current_stage,
             a.owner_unit,
             s.name as source_unit_name,
             d.name as responsible_dept_name
      FROM risk_warnings rw
      LEFT JOIN assets a ON rw.asset_id = a.id
      LEFT JOIN departments s ON a.source_unit_id = s.id
      LEFT JOIN lifecycle_stages ls ON a.id = ls.asset_id AND a.current_stage = ls.stage_name
      LEFT JOIN departments d ON ls.responsible_dept_id = d.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.dept_id) {
      query += " AND ls.responsible_dept_id = ?";
      params.push(filters.dept_id);
    }

    if (filters.stage) {
      query += " AND a.current_stage = ?";
      params.push(filters.stage);
    }

    if (filters.status) {
      query += " AND rw.status = ?";
      params.push(filters.status);
    } else {
      query += " AND rw.status IN ('pending', 'handling', 'reviewing')";
    }

    query += " ORDER BY rw.risk_score ASC, rw.created_at DESC";

    const rawWarnings = db.prepare(query).all(...params);

    const warnings = rawWarnings.map((w) => {
      const updated = applySlaEscalation(w) || w;
      const effectiveLevel = updated.escalated_level || updated.risk_level;
      return {
        ...updated,
        effective_risk_level: effectiveLevel,
        is_escalated: (updated.escalation_count || 0) > 0,
      };
    });

    if (filters.risk_level) {
      const filtered = warnings.filter(
        (w) => w.effective_risk_level === filters.risk_level,
      );
      return { warnings: filtered };
    }

    return { warnings };
  },

  getAssetRiskInfo(assetId) {
    const riskData = this.calculateAssetRiskScore(assetId);
    if (!riskData) {
      throw new NotFoundError("资产不存在");
    }

    const rawWarnings = db
      .prepare(
        `
      SELECT * FROM risk_warnings 
      WHERE asset_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
      )
      .all(assetId);

    const warnings = rawWarnings.map((w) => {
      const updated =
        w.status === WARNING_STATUS.PENDING ? applySlaEscalation(w) || w : w;
      return {
        ...updated,
        effective_risk_level: updated.escalated_level || updated.risk_level,
        is_escalated: (updated.escalation_count || 0) > 0,
      };
    });

    const handlingRecords = db
      .prepare(
        `
      SELECT hr.*, d.name as operator_name
      FROM handling_records hr
      LEFT JOIN departments d ON hr.operator_id = d.id
      WHERE hr.asset_id = ?
      ORDER BY hr.created_at DESC
    `,
      )
      .all(assetId);

    const escalationLogs = db
      .prepare(
        `SELECT * FROM escalation_logs
         WHERE asset_id = ?
         ORDER BY created_at DESC`,
      )
      .all(assetId);

    return {
      ...riskData,
      warnings,
      handlingRecords,
      escalationLogs,
      hasWarning: riskData.riskScore < RISK_THRESHOLD,
    };
  },

  getRiskOverview(filters = {}) {
    const allWarnings = this.getAllRiskWarnings(filters).warnings;

    const levelOf = (w) => w.effective_risk_level || w.risk_level;

    const stats = {
      total: allWarnings.length,
      critical: allWarnings.filter((w) => levelOf(w) === "critical").length,
      high: allWarnings.filter((w) => levelOf(w) === "high").length,
      medium: allWarnings.filter((w) => levelOf(w) === "medium").length,
      pending: allWarnings.filter((w) => w.status === "pending").length,
      handling: allWarnings.filter((w) => w.status === "handling").length,
      reviewing: allWarnings.filter((w) => w.status === "reviewing").length,
      escalated: allWarnings.filter((w) => w.is_escalated).length,
    };

    return { stats, warnings: allWarnings.slice(0, 10) };
  },

  getAssetsWithWarnings() {
    const warnings = db
      .prepare(
        `
      SELECT *
      FROM risk_warnings
      WHERE status IN ('pending', 'handling', 'reviewing')
    `,
      )
      .all();

    const assetWarningMap = {};
    warnings.forEach((w) => {
      const updated = applySlaEscalation(w) || w;
      assetWarningMap[updated.asset_id] = {
        risk_level: updated.escalated_level || updated.risk_level,
        original_risk_level: updated.risk_level,
        risk_score: updated.risk_score,
        is_escalated: (updated.escalation_count || 0) > 0,
        status: updated.status,
      };
    });

    return { assetWarningMap };
  },
};

module.exports = {
  riskService,
  calculateAssetRiskScore:
    riskService.calculateAssetRiskScore.bind(riskService),
  updateAssetRiskWarning: riskService.updateAssetRiskWarning.bind(riskService),
  handleWarning: riskService.handleWarning.bind(riskService),
  reviewWarning: riskService.reviewWarning.bind(riskService),
  getAllRiskWarnings: riskService.getAllRiskWarnings.bind(riskService),
  getAssetRiskInfo: riskService.getAssetRiskInfo.bind(riskService),
  RISK_THRESHOLD,
};
