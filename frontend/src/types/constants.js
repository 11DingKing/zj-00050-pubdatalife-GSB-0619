export const STAGES = [
  { name: "资源登记", order: 1, deptType: "dataBureau" },
  { name: "清洗加工", order: 2, deptType: "operator" },
  { name: "知识产权登记", order: 3, deptType: "marketRegulator" },
  { name: "合规挂牌", order: 4, deptType: "financeBureau" },
  { name: "市场交易", order: 5, deptType: "operator" },
  { name: "收益入库", order: 6, deptType: "financeBureau" },
];

export const DEPARTMENT_TYPES = {
  DATA_BUREAU: "dataBureau",
  OPERATOR: "operator",
  MARKET_REGULATOR: "marketRegulator",
  FINANCE_BUREAU: "financeBureau",
  SOURCE_UNIT: "sourceUnit",
};

export const STAGE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export const RISK_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

export const RISK_THRESHOLD = 60;

export const WARNING_STATUS = {
  PENDING: "pending",
  HANDLING: "handling",
  RESOLVED: "resolved",
};

export const COLLABORATION_ACTIONS = {
  STAGE_COMPLETE: "stage_complete",
  URGE: "urge",
};

export const OWNERSHIP_STATUS = {
  NOT_CONFIRMED: "未确权",
  CONFIRMING: "确权中",
  CONFIRMED: "已确权",
};

export const riskLevelColors = {
  critical: "#ff4d4f",
  high: "#fa8c16",
  medium: "#faad14",
  low: "#52c41a",
};

export const riskLevelLabels = {
  critical: "极高",
  high: "高",
  medium: "中",
  low: "低",
};

export const stageColors = {
  资源登记: "blue",
  清洗加工: "cyan",
  知识产权登记: "purple",
  合规挂牌: "geekblue",
  市场交易: "orange",
  收益入库: "green",
  已完成: "success",
};

export const statusColors = {
  pending: { color: "orange", label: "待处理" },
  completed: { color: "green", label: "已完成" },
  in_progress: { color: "blue", label: "进行中" },
};

export const warningStatusColors = {
  pending: { color: "#ff4d4f", label: "待处理" },
  handling: { color: "#1890ff", label: "处理中" },
  pending_review: { color: "#722ed1", label: "待复核" },
  resolved: { color: "#52c41a", label: "已解决" },
};

export const actionTypeLabels = {
  stage_complete: { color: "green", label: "阶段完成" },
  urge: { color: "orange", label: "催办" },
  meeting: { color: "purple", label: "协调会" },
  direct_advance: { color: "cyan", label: "直接推进" },
};
