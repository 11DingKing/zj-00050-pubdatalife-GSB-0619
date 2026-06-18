const { db, STAGES } = require('./database');
const { v4: uuidv4 } = require('uuid');

const initSampleData = () => {
  const deptCheck = db.prepare('SELECT COUNT(*) as count FROM departments').get();
  if (deptCheck.count > 0) {
    console.log('数据已存在，跳过初始化');
    return;
  }

  const insertDept = db.prepare(`
    INSERT INTO departments (id, name, type) VALUES (?, ?, ?)
  `);

  const departments = [
    { id: 'dept_data', name: '玄武区数据局', type: 'dataBureau' },
    { id: 'dept_finance', name: '玄武区财政局', type: 'financeBureau' },
    { id: 'dept_market', name: '玄武区市场监管局', type: 'marketRegulator' },
    { id: 'dept_operator', name: '玄武数据运营有限公司', type: 'operator' },
    { id: 'dept_civil', name: '玄武区民政局', type: 'sourceUnit' },
    { id: 'dept_edu', name: '玄武区教育局', type: 'sourceUnit' },
    { id: 'dept_health', name: '玄武区卫健委', type: 'sourceUnit' }
  ];

  departments.forEach(d => insertDept.run(d.id, d.name, d.type));
  console.log('部门数据初始化完成');

  const insertAsset = db.prepare(`
    INSERT INTO assets (id, name, owner_unit, data_scale, ownership_status, current_stage, source_unit_id, operator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStage = db.prepare(`
    INSERT INTO lifecycle_stages (id, asset_id, stage_name, stage_order, responsible_dept_id, deadline, status, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTodo = db.prepare(`
    INSERT INTO todo_items (id, asset_id, dept_id, stage_name, title, status, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCollab = db.prepare(`
    INSERT INTO collaboration_records (id, asset_id, from_dept_id, to_dept_id, stage_name, action, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRevenue = db.prepare(`
    INSERT INTO revenue_records (id, asset_id, amount, transaction_date, buyer)
    VALUES (?, ?, ?, ?, ?)
  `);

  const assets = [
    {
      id: 'asset_1',
      name: '玄武区人口基础信息库',
      owner_unit: '玄武区民政局',
      data_scale: '50万条',
      ownership_status: '已确权',
      current_stage: '收益入库',
      source_unit_id: 'dept_civil',
      operator_id: 'dept_operator',
      stages: [
        { stage: '资源登记', status: 'completed', dept: 'dept_data', days: 3 },
        { stage: '清洗加工', status: 'completed', dept: 'dept_operator', days: 7 },
        { stage: '知识产权登记', status: 'completed', dept: 'dept_market', days: 5 },
        { stage: '合规挂牌', status: 'completed', dept: 'dept_finance', days: 3 },
        { stage: '市场交易', status: 'completed', dept: 'dept_operator', days: 10 },
        { stage: '收益入库', status: 'in_progress', dept: 'dept_finance', days: 0 }
      ],
      revenue: 150000
    },
    {
      id: 'asset_2',
      name: '玄武区教育资源数据目录',
      owner_unit: '玄武区教育局',
      data_scale: '1200条',
      ownership_status: '已确权',
      current_stage: '市场交易',
      source_unit_id: 'dept_edu',
      operator_id: 'dept_operator',
      stages: [
        { stage: '资源登记', status: 'completed', dept: 'dept_data', days: 2 },
        { stage: '清洗加工', status: 'completed', dept: 'dept_operator', days: 5 },
        { stage: '知识产权登记', status: 'completed', dept: 'dept_market', days: 4 },
        { stage: '合规挂牌', status: 'completed', dept: 'dept_finance', days: 2 },
        { stage: '市场交易', status: 'in_progress', dept: 'dept_operator', days: 0 },
        { stage: '收益入库', status: 'pending', dept: 'dept_finance', days: 0 }
      ],
      revenue: 0
    },
    {
      id: 'asset_3',
      name: '玄武区医疗健康数据集',
      owner_unit: '玄武区卫健委',
      data_scale: '30万条',
      ownership_status: '确权中',
      current_stage: '清洗加工',
      source_unit_id: 'dept_health',
      operator_id: 'dept_operator',
      stages: [
        { stage: '资源登记', status: 'completed', dept: 'dept_data', days: 5 },
        { stage: '清洗加工', status: 'in_progress', dept: 'dept_operator', days: 0, overdue: true },
        { stage: '知识产权登记', status: 'pending', dept: 'dept_market', days: 0 },
        { stage: '合规挂牌', status: 'pending', dept: 'dept_finance', days: 0 },
        { stage: '市场交易', status: 'pending', dept: 'dept_operator', days: 0 },
        { stage: '收益入库', status: 'pending', dept: 'dept_finance', days: 0 }
      ],
      revenue: 0
    },
    {
      id: 'asset_4',
      name: '玄武区企业信用信息',
      owner_unit: '玄武区市场监管局',
      data_scale: '8万条',
      ownership_status: '已确权',
      current_stage: '知识产权登记',
      source_unit_id: 'dept_market',
      operator_id: 'dept_operator',
      stages: [
        { stage: '资源登记', status: 'completed', dept: 'dept_data', days: 2 },
        { stage: '清洗加工', status: 'completed', dept: 'dept_operator', days: 4 },
        { stage: '知识产权登记', status: 'in_progress', dept: 'dept_market', days: 0 },
        { stage: '合规挂牌', status: 'pending', dept: 'dept_finance', days: 0 },
        { stage: '市场交易', status: 'pending', dept: 'dept_operator', days: 0 },
        { stage: '收益入库', status: 'pending', dept: 'dept_finance', days: 0 }
      ],
      revenue: 0
    },
    {
      id: 'asset_5',
      name: '玄武区交通出行数据',
      owner_unit: '玄武区住建局',
      data_scale: '200万条',
      ownership_status: '未确权',
      current_stage: '资源登记',
      source_unit_id: 'dept_data',
      operator_id: 'dept_operator',
      stages: [
        { stage: '资源登记', status: 'in_progress', dept: 'dept_data', days: 0 },
        { stage: '清洗加工', status: 'pending', dept: 'dept_operator', days: 0 },
        { stage: '知识产权登记', status: 'pending', dept: 'dept_market', days: 0 },
        { stage: '合规挂牌', status: 'pending', dept: 'dept_finance', days: 0 },
        { stage: '市场交易', status: 'pending', dept: 'dept_operator', days: 0 },
        { stage: '收益入库', status: 'pending', dept: 'dept_finance', days: 0 }
      ],
      revenue: 0
    }
  ];

  const now = new Date();

  assets.forEach(asset => {
    insertAsset.run(
      asset.id,
      asset.name,
      asset.owner_unit,
      asset.data_scale,
      asset.ownership_status,
      asset.current_stage,
      asset.source_unit_id,
      asset.operator_id
    );

    let accumulatedDays = 0;

    asset.stages.forEach((s) => {
      const stageInfo = STAGES.find(st => st.name === s.stage);
      const stageOrder = stageInfo.order;
      
      let startedAt = null;
      let completedAt = null;
      let deadline = null;

      if (s.status === 'completed') {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (accumulatedDays + s.days + 7));
        startedAt = startDate.toISOString();
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + s.days);
        completedAt = endDate.toISOString();
        
        accumulatedDays += s.days;
      } else if (s.status === 'in_progress') {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 2);
        startedAt = startDate.toISOString();
        
        const deadlineDate = new Date(startDate);
        if (s.overdue) {
          deadlineDate.setDate(deadlineDate.getDate() - 1);
        } else {
          deadlineDate.setDate(deadlineDate.getDate() + 5);
        }
        deadline = deadlineDate.toISOString();

        insertTodo.run(
          uuidv4(),
          asset.id,
          s.dept,
          s.stage,
          `${asset.name} - ${s.stage}`,
          'pending',
          deadline
        );
      }

      insertStage.run(
        uuidv4(),
        asset.id,
        s.stage,
        stageOrder,
        s.dept,
        deadline,
        s.status,
        startedAt,
        completedAt
      );

      if (s.status === 'completed' && stageOrder < 6) {
        const nextStage = STAGES.find(st => st.order === stageOrder + 1);
        if (nextStage) {
          const nextDept = asset.stages.find(st => st.stage === nextStage.name);
          if (nextDept) {
            insertCollab.run(
              uuidv4(),
              asset.id,
              s.dept,
              nextDept.dept,
              s.stage,
              'stage_complete',
              `${s.stage}已完成，流转至下一阶段`
            );
          }
        }
      }
    });

    if (asset.revenue > 0) {
      const revenueDate = new Date(now);
      revenueDate.setDate(revenueDate.getDate() - 3);
      insertRevenue.run(
        uuidv4(),
        asset.id,
        asset.revenue,
        revenueDate.toISOString(),
        '南京某科技有限公司'
      );
    }
  });

  console.log('示例资产数据初始化完成');
  console.log('初始化数据完成！');
};

module.exports = { initSampleData };
