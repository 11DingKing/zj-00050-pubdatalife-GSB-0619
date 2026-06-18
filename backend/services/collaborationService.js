const { v4: uuidv4 } = require("uuid");
const { db } = require("../database");
const { NotFoundError } = require("../middleware/errorHandler");
const { COLLABORATION_ACTIONS, STAGE_STATUS } = require("../models");

const collaborationService = {
  getAllRecords() {
    return db
      .prepare(
        `
      SELECT cr.*, 
             a.name as asset_name,
             fd.name as from_dept_name,
             td.name as to_dept_name
      FROM collaboration_records cr
      LEFT JOIN assets a ON cr.asset_id = a.id
      LEFT JOIN departments fd ON cr.from_dept_id = fd.id
      LEFT JOIN departments td ON cr.to_dept_id = td.id
      ORDER BY cr.created_at DESC
    `,
      )
      .all();
  },

  urgeCollaboration(collaborationId) {
    const collaboration = db
      .prepare(
        `
      SELECT cr.*, a.name as asset_name
      FROM collaboration_records cr
      LEFT JOIN assets a ON cr.asset_id = a.id
      WHERE cr.id = ?
    `,
      )
      .get(collaborationId);

    if (!collaboration) {
      throw new NotFoundError("协同记录不存在");
    }

    const existingTodo = db
      .prepare(
        `
      SELECT * FROM todo_items 
      WHERE asset_id = ? AND stage_name = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      )
      .get(collaboration.asset_id, collaboration.stage_name);

    const now = new Date().toISOString();
    let todoId;

    if (!existingTodo) {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);

      todoId = uuidv4();
      db.prepare(
        `
        INSERT INTO todo_items (id, asset_id, dept_id, stage_name, title, status, deadline, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        todoId,
        collaboration.asset_id,
        collaboration.to_dept_id,
        collaboration.stage_name,
        `【催办】${collaboration.asset_name || "资产"} - ${collaboration.stage_name}`,
        STAGE_STATUS.PENDING,
        deadlineDate.toISOString(),
        now,
      );
    } else {
      todoId = existingTodo.id;
    }

    db.prepare(
      `
      INSERT INTO collaboration_records (id, asset_id, from_dept_id, to_dept_id, stage_name, action, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      uuidv4(),
      collaboration.asset_id,
      collaboration.from_dept_id,
      collaboration.to_dept_id,
      collaboration.stage_name,
      COLLABORATION_ACTIONS.URGE,
      `催办：${collaboration.stage_name} 阶段待处理`,
      now,
    );

    return {
      success: true,
      message: "催办成功，待办已发送",
      todoId,
    };
  },
};

module.exports = { collaborationService };
