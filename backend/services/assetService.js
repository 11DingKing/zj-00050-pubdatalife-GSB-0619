const { v4: uuidv4 } = require("uuid");
const { db } = require("../database");
const {
  STAGES,
  DEPARTMENT_TYPES,
  STAGE_STATUS,
  COLLABORATION_ACTIONS,
} = require("../models");
const {
  NotFoundError,
  ValidationError,
} = require("../middleware/errorHandler");

const assetService = {
  getDepartments() {
    return db.prepare("SELECT * FROM departments").all();
  },

  getAllAssets() {
    return db
      .prepare(
        `
      SELECT a.*, 
             s.name as source_unit_name,
             o.name as operator_name
      FROM assets a
      LEFT JOIN departments s ON a.source_unit_id = s.id
      LEFT JOIN departments o ON a.operator_id = o.id
      ORDER BY a.created_at DESC
    `,
      )
      .all();
  },

  getAssetById(id) {
    const asset = db
      .prepare(
        `
      SELECT a.*, 
             s.name as source_unit_name,
             o.name as operator_name
      FROM assets a
      LEFT JOIN departments s ON a.source_unit_id = s.id
      LEFT JOIN departments o ON a.operator_id = o.id
      WHERE a.id = ?
    `,
      )
      .get(id);

    if (!asset) {
      throw new NotFoundError("资产不存在");
    }

    const stages = db
      .prepare(
        `
      SELECT ls.*, d.name as responsible_dept_name
      FROM lifecycle_stages ls
      LEFT JOIN departments d ON ls.responsible_dept_id = d.id
      WHERE ls.asset_id = ?
      ORDER BY ls.stage_order
    `,
      )
      .all(id);

    return { asset, stages };
  },

  createAsset(assetData) {
    const {
      name,
      owner_unit,
      data_scale,
      ownership_status,
      source_unit_id,
      operator_id,
    } = assetData;

    if (!name || !owner_unit) {
      throw new ValidationError("资产名称和所属单位不能为空");
    }

    const id = uuidv4();
    const current_stage = STAGES[0].name;

    db.prepare(
      `
      INSERT INTO assets (id, name, owner_unit, data_scale, ownership_status, current_stage, source_unit_id, operator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      name,
      owner_unit,
      data_scale,
      ownership_status,
      current_stage,
      source_unit_id,
      operator_id,
    );

    const dataBureau = db
      .prepare("SELECT * FROM departments WHERE type = ?")
      .get(DEPARTMENT_TYPES.DATA_BUREAU);

    STAGES.forEach((stage, index) => {
      const stageId = uuidv4();
      const dept = db
        .prepare("SELECT * FROM departments WHERE type = ?")
        .get(stage.deptType);
      const status =
        index === 0 ? STAGE_STATUS.IN_PROGRESS : STAGE_STATUS.PENDING;

      let deadline = null;
      if (index === 0) {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        deadline = deadlineDate.toISOString();
      }

      db.prepare(
        `
        INSERT INTO lifecycle_stages (id, asset_id, stage_name, stage_order, responsible_dept_id, deadline, status, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        stageId,
        id,
        stage.name,
        stage.order,
        dept?.id,
        deadline,
        status,
        index === 0 ? new Date().toISOString() : null,
      );

      if (index === 0 && dept) {
        db.prepare(
          `
          INSERT INTO todo_items (id, asset_id, dept_id, stage_name, title, status, deadline)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          uuidv4(),
          id,
          dept.id,
          stage.name,
          `${name} - ${stage.name}`,
          STAGE_STATUS.PENDING,
          deadline,
        );
      }
    });

    return { id, message: "资产创建成功" };
  },

  completeStage(assetId, stageData) {
    const { remark, amount, buyer } = stageData;

    const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId);
    if (!asset) {
      throw new NotFoundError("资产不存在");
    }

    const currentStageInfo = STAGES.find((s) => s.name === asset.current_stage);
    const currentStage = db
      .prepare(
        `
      SELECT * FROM lifecycle_stages 
      WHERE asset_id = ? AND stage_name = ?
    `,
      )
      .get(assetId, asset.current_stage);

    if (!currentStage) {
      throw new ValidationError("当前阶段不存在");
    }

    const completedAt = new Date().toISOString();
    db.prepare(
      `
      UPDATE lifecycle_stages 
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `,
    ).run(completedAt, currentStage.id);

    db.prepare(
      `
      UPDATE todo_items 
      SET status = 'completed'
      WHERE asset_id = ? AND stage_name = ?
    `,
    ).run(assetId, asset.current_stage);

    if (currentStageInfo.name === "市场交易" && amount) {
      db.prepare(
        `
        INSERT INTO revenue_records (id, asset_id, amount, transaction_date, buyer)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(uuidv4(), assetId, amount, completedAt, buyer || "");
    }

    const nextStageOrder = currentStageInfo.order + 1;

    if (nextStageOrder <= STAGES.length) {
      const nextStageInfo = STAGES.find((s) => s.order === nextStageOrder);
      const nextDept = db
        .prepare("SELECT * FROM departments WHERE type = ?")
        .get(nextStageInfo.deptType);

      db.prepare(
        `
        UPDATE lifecycle_stages 
        SET status = 'in_progress', started_at = ?, deadline = ?
        WHERE asset_id = ? AND stage_order = ?
      `,
      ).run(completedAt, null, assetId, nextStageOrder);

      if (nextDept) {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);

        db.prepare(
          `
          INSERT INTO todo_items (id, asset_id, dept_id, stage_name, title, status, deadline)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          uuidv4(),
          assetId,
          nextDept.id,
          nextStageInfo.name,
          `${asset.name} - ${nextStageInfo.name}`,
          STAGE_STATUS.PENDING,
          deadlineDate.toISOString(),
        );

        db.prepare(
          `
          INSERT INTO collaboration_records (id, asset_id, from_dept_id, to_dept_id, stage_name, action, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          uuidv4(),
          assetId,
          currentStage.responsible_dept_id,
          nextDept.id,
          currentStage.stage_name,
          COLLABORATION_ACTIONS.STAGE_COMPLETE,
          remark || `${currentStage.stage_name}已完成`,
        );
      }

      db.prepare(
        `
        UPDATE assets 
        SET current_stage = ?, updated_at = ?
        WHERE id = ?
      `,
      ).run(nextStageInfo.name, completedAt, assetId);

      return {
        message: "阶段完成，已流转至下一阶段",
        nextStage: nextStageInfo.name,
      };
    } else {
      db.prepare(
        `
        UPDATE assets 
        SET current_stage = '已完成', updated_at = ?
        WHERE id = ?
      `,
      ).run(completedAt, assetId);

      return { message: "全流程已完成" };
    }
  },
};

module.exports = { assetService };
