const STAGES = [
  { name: "资源登记", order: 1, deptType: "dataBureau" },
  { name: "清洗加工", order: 2, deptType: "operator" },
  { name: "知识产权登记", order: 3, deptType: "marketRegulator" },
  { name: "合规挂牌", order: 4, deptType: "financeBureau" },
  { name: "市场交易", order: 5, deptType: "operator" },
  { name: "收益入库", order: 6, deptType: "financeBureau" },
];

const DEPARTMENT_TYPES = {
  DATA_BUREAU: "dataBureau",
  OPERATOR: "operator",
  MARKET_REGULATOR: "marketRegulator",
  FINANCE_BUREAU: "financeBureau",
  SOURCE_UNIT: "sourceUnit",
};

const STAGE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

const RISK_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

const RISK_THRESHOLD = 60;

const RISK_WEIGHTS = {
  overdueDays: 0.3,
  stageStuckDays: 0.25,
  responseSpeed: 0.25,
  historicalPassRate: 0.2,
};

const WARNING_STATUS = {
  PENDING: "pending",
  HANDLING: "handling",
  RESOLVED: "resolved",
};

const COLLABORATION_ACTIONS = {
  STAGE_COMPLETE: "stage_complete",
  URGE: "urge",
};

const OWNERSHIP_STATUS = {
  NOT_CONFIRMED: "未确权",
  CONFIRMING: "确权中",
  CONFIRMED: "已确权",
};

const TABLE_NAMES = {
  DEPARTMENTS: "departments",
  ASSETS: "assets",
  LIFECYCLE_STAGES: "lifecycle_stages",
  COLLABORATION_RECORDS: "collaboration_records",
  TODO_ITEMS: "todo_items",
  REVENUE_RECORDS: "revenue_records",
  RISK_WARNINGS: "risk_warnings",
  HANDLING_RECORDS: "handling_records",
};

module.exports = {
  STAGES,
  DEPARTMENT_TYPES,
  STAGE_STATUS,
  RISK_LEVELS,
  RISK_THRESHOLD,
  RISK_WEIGHTS,
  WARNING_STATUS,
  COLLABORATION_ACTIONS,
  OWNERSHIP_STATUS,
  TABLE_NAMES,
};
