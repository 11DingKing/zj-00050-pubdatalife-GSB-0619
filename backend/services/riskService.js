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
  SLA_ESCALATION_DAYS,
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

function getNextRiskLevel(currentLevel) {
  const idx = RISK_LEVEL_ORDER.indexOf(currentLevel);
  if (idx === -1 || idx >= RISK_LEVEL_ORDER.length - 1) return currentLevel;
  return RISK_LEVEL_ORDER[idx + 1];
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

function applySlaEscalation(warning) {
  if (warning.status !== WARNING_STATUS.PENDING) {
    return warning;
  }

  const referenceTime = warning.last_escalated_at || warning.created_at;
  const refDate = new Date(referenceTime);
  const now = new Date();
  const daysSinceRef = Math.floor((now - refDate) / (1000 * 60 * 60 * 24));

  if (daysSinceRef < SLA_ESCALATION_DAYS) {
    return warning;
  }

  const escalationsNeeded = Math.floor(daysSinceRef / SLA_ESCALATION_DAYS);
  let currentLevel = warning.risk_level;
  const originalLevel = warning.original_risk_level || warning.risk_level;
  let escalationsApplied = 0;

  for (let i = 0; i < escalationsNeeded; i++) {
    const nextLevel = getNextRiskLevel(currentLevel);
    if (nextLevel === currentLevel) break;
    currentLevel = nextLevel;
    escalationsApplied++;
  }

  if (escalationsApplied === 0) {
    return warning;
  }

  const nowIso = now.toISOString();

  let stepFrom = warning.risk_level;
  for (let i = 0; i < escalationsApplied; i++) {
    const stepTo = getNextRiskLevel(stepFrom);

    const escId = uuidv4();
    db.prepare(
      `
      INSERT INTO warning_escalations (id, warning_id, from_level, to_level, reason, escalated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      escId,
      warning.id,
      stepFrom,
      stepTo,
      `SLA超时自动升级（pending超过${SLA_ESCALATION_DAYS}天未进入handling）`,
      nowIso,
    );
    stepFrom = stepTo;
  }

  db.prepare(
    `
    UPDATE risk_warnings 
    SET risk_level = ?, original_risk_level = COALESCE(original_risk_level, ?),
        last_escalated_at = ?, escalation_count = escalation_count + ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(
    currentLevel,
    originalLevel,
    nowIso,
    escalationsApplied,
    nowIso,
    warning.id,
  );

  return {
    ...warning,
    risk_level: currentLevel,
    original_risk_level: originalLevel,
    last_escalated_at: nowIso,
    escalation_count: (warning.escalation_count || 0) + escalationsApplied,
  };
}

function enrichWarningWithEscalationInfo(warning) {
  const escalations = db
    .prepare(
      `
    SELECT * FROM warning_escalations 
    WHERE warning_id = ? 
    ORDER BY escalated_at ASC
  `,
    )
    .all(warning.id);

  return {
    ...warning,
    has_escalated: (warning.escalation_count || 0) > 0,
    escalations,
  };
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
      WHERE asset_id = ? AND status IN ('pending', 'handling', 'pending_review')
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
          SET risk_score = ?, overdue_days = ?, 
              stage_stuck_days = ?, response_speed_score = ?, 
              historical_pass_rate = ?, suggested_actions = ?, updated_at = ?
          WHERE id = ?
        `,
        ).run(
          riskData.riskScore,
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
            status, suggested_actions, created_at, updated_at, escalation_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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
      if (existingWarning && existingWarning.status === WARNING_STATUS.PENDING) {
        db.prepare(
          `
          UPDATE risk_warnings 
          SET status = 'resolved', updated_at = ?, handled_at = ?, review_status = 'auto_resolved'
          WHERE id = ?
        `,
        ).run(now, now, existingWarning.id);
      }
      return { ...riskData, warningId: null, isWarning: false };
    }
  },

  handleWarning(warningId, actionType, remark, rectificationResult, operatorId) {
    if (!actionType) {
      throw new ValidationError("请指定处置类型");
    }
    if (!rectificationResult || !rectificationResult.trim()) {
      throw new ValidationError("请填写整改结果");
    }

    const warning = db
      .prepare("SELECT * FROM risk_warnings WHERE id = ?")
      .get(warningId);
    if (!warning) {
      throw new NotFoundError("预警不存在");
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

    this.updateAssetRiskWarning(warning.asset_id);

    db.prepare(
      `
      UPDATE risk_warnings 
      SET status = ?, updated_at = ?, handling_remark = ?, handled_at = ?,
          rectification_result = ?, review_status = 'pending'
      WHERE id = ?
    `,
    ).run(
      WARNING_STATUS.PENDING_REVIEW,
      now,
      remark || "",
      now,
      rectificationResult,
      warningId,
    );

    return {
      success: true,
      message: "处置已提交，等待复核确认",
      handlingRecordId: recordId,
    };
  },

  reviewWarning(warningId, approved, reviewRemark, reviewerId) {
    const warning = db
      .prepare("SELECT * FROM risk_warnings WHERE id = ?")
      .get(warningId);
    if (!warning) {
      throw new NotFoundError("预警不存在");
    }

    if (warning.status !== WARNING_STATUS.PENDING_REVIEW) {
      throw new ValidationError("该预警当前状态不允许复核");
    }

    const now = new Date().toISOString();

    if (approved) {
      db.prepare(
        `
        UPDATE risk_warnings 
        SET status = ?, updated_at = ?, reviewed_at = ?, reviewer_id = ?, 
            review_remark = ?, review_status = 'approved'
        WHERE id = ?
      `,
      ).run(
        WARNING_STATUS.RESOLVED,
        now,
        now,
        reviewerId || null,
        reviewRemark || "",
        warningId,
      );

      return {
        success: true,
        message: "复核通过，预警已闭环",
      };
    } else {
      if (!reviewRemark || !reviewRemark.trim()) {
        throw new ValidationError("驳回时请填写复核意见");
      }

      db.prepare(
        `
        UPDATE risk_warnings 
        SET status = ?, updated_at = ?, review_remark = ?, review_status = 'rejected'
        WHERE id = ?
      `,
      ).run(
        WARNING_STATUS.HANDLING,
        now,
        reviewRemark,
        warningId,
      );

      return {
        success: true,
        message: "已驳回，请重新处置",
      };
    }
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

    if (filters.risk_level) {
      query += " AND rw.risk_level = ?";
      params.push(filters.risk_level);
    }

    if (filters.stage) {
      query += " AND a.current_stage = ?";
      params.push(filters.stage);
    }

    if (filters.status) {
      query += " AND rw.status = ?";
      params.push(filters.status);
    } else {
      query += " AND rw.status IN ('pending', 'handling', 'pending_review')";
    }

    query += " ORDER BY rw.risk_score ASC, rw.created_at DESC";

    let warnings = db.prepare(query).all(...params);

    warnings = warnings.map((w) => {
      const afterEscalation = applySlaEscalation(w);
      return enrichWarningWithEscalationInfo(afterEscalation);
    });

    return { warnings };
  },

  getAssetRiskInfo(assetId) {
    const riskData = this.calculateAssetRiskScore(assetId);
    if (!riskData) {
      throw new NotFoundError("资产不存在");
    }

    let warnings = db
      .prepare(
        `
      SELECT * FROM risk_warnings 
      WHERE asset_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
      )
      .all(assetId);

    warnings = warnings.map((w) => {
      const afterEscalation = applySlaEscalation(w);
      return enrichWarningWithEscalationInfo(afterEscalation);
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

    return {
      ...riskData,
      warnings,
      handlingRecords,
      hasWarning: riskData.riskScore < RISK_THRESHOLD,
    };
  },

  getRiskOverview(filters = {}) {
    const allWarnings = this.getAllRiskWarnings(filters).warnings;

    const stats = {
      total: allWarnings.length,
      critical: allWarnings.filter((w) => w.risk_level === "critical").length,
      high: allWarnings.filter((w) => w.risk_level === "high").length,
      medium: allWarnings.filter((w) => w.risk_level === "medium").length,
      pending: allWarnings.filter((w) => w.status === "pending").length,
      handling: allWarnings.filter((w) => w.status === "handling").length,
      pending_review: allWarnings.filter((w) => w.status === "pending_review").length,
      escalated: allWarnings.filter((w) => w.has_escalated).length,
    };

    return { stats, warnings: allWarnings.slice(0, 10) };
  },

  getAssetsWithWarnings() {
    this.getAllRiskWarnings();

    const warnings = db
      .prepare(
        `
      SELECT asset_id, risk_level, risk_score, escalation_count
      FROM risk_warnings
      WHERE status IN ('pending', 'handling', 'pending_review')
    `,
      )
      .all();

    const assetWarningMap = {};
    warnings.forEach((w) => {
      assetWarningMap[w.asset_id] = {
        risk_level: w.risk_level,
        risk_score: w.risk_score,
        has_escalated: (w.escalation_count || 0) > 0,
      };
    });

    return { assetWarningMap };
  },

  getWarningEscalations(warningId) {
    const escalations = db
      .prepare(
        `
      SELECT * FROM warning_escalations 
      WHERE warning_id = ? 
      ORDER BY escalated_at DESC
    `,
      )
      .all(warningId);
    return { escalations };
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
  getRiskOverview: riskService.getRiskOverview.bind(riskService),
  getAssetsWithWarnings: riskService.getAssetsWithWarnings.bind(riskService),
  getWarningEscalations: riskService.getWarningEscalations.bind(riskService),
  RISK_THRESHOLD,
};
