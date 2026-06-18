const { db } = require("../database");
const { STAGES } = require("../models");

const todoService = {
  getTodos(deptId) {
    let query = `
      SELECT t.*, a.name as asset_name, a.owner_unit
      FROM todo_items t
      LEFT JOIN assets a ON t.asset_id = a.id
    `;
    let params = [];

    if (deptId) {
      query += " WHERE t.dept_id = ?";
      params.push(deptId);
    }

    query += " ORDER BY t.created_at DESC";

    return db.prepare(query).all(...params);
  },
};

const statisticsService = {
  getDashboard() {
    const stageStats = {};
    STAGES.forEach((s) => {
      stageStats[s.name] = 0;
    });

    const assetsByStage = db
      .prepare(
        `
      SELECT current_stage, COUNT(*) as count
      FROM assets
      WHERE current_stage != '已完成'
      GROUP BY current_stage
    `,
      )
      .all();

    assetsByStage.forEach((s) => {
      stageStats[s.current_stage] = s.count;
    });

    const completedAssets = db
      .prepare(
        "SELECT COUNT(*) as count FROM assets WHERE current_stage = '已完成'",
      )
      .get();

    const avgDuration = {};
    STAGES.forEach((s) => {
      const result = db
        .prepare(
          `
        SELECT AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) as avg_days
        FROM lifecycle_stages
        WHERE stage_name = ? AND status = 'completed'
      `,
        )
        .get(s.name);
      avgDuration[s.name] = result.avg_days
        ? parseFloat(result.avg_days.toFixed(1))
        : 0;
    });

    const totalRevenue = db
      .prepare("SELECT SUM(amount) as total FROM revenue_records")
      .get();
    const revenueCount = db
      .prepare("SELECT COUNT(*) as count FROM revenue_records")
      .get();

    const overdueAssets = db
      .prepare(
        `
      SELECT a.id, a.name, a.current_stage, ls.deadline
      FROM assets a
      JOIN lifecycle_stages ls ON a.id = ls.asset_id AND a.current_stage = ls.stage_name
      WHERE ls.status = 'in_progress' 
        AND ls.deadline IS NOT NULL 
        AND ls.deadline < datetime('now')
    `,
      )
      .all();

    return {
      stageStats,
      completedCount: completedAssets.count,
      avgDuration,
      totalRevenue: totalRevenue.total || 0,
      revenueCount: revenueCount.count,
      overdueAssets,
    };
  },

  getRevenue() {
    return db
      .prepare(
        `
      SELECT rr.*, a.name as asset_name
      FROM revenue_records rr
      LEFT JOIN assets a ON rr.asset_id = a.id
      ORDER BY rr.transaction_date DESC
    `,
      )
      .all();
  },
};

module.exports = { todoService, statisticsService };
