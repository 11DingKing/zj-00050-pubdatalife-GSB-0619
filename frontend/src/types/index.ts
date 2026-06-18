export interface Department {
  id: string;
  name: string;
  type: string;
  created_at?: string;
}

export interface Asset {
  id: string;
  name: string;
  owner_unit: string;
  data_scale?: string;
  ownership_status?: string;
  current_stage: string;
  source_unit_id?: string;
  operator_id?: string;
  source_unit_name?: string;
  operator_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LifecycleStage {
  id: string;
  asset_id: string;
  stage_name: string;
  stage_order: number;
  responsible_dept_id: string;
  responsible_dept_name?: string;
  deadline?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface AssetDetail {
  asset: Asset;
  stages: LifecycleStage[];
}

export interface CreateAssetRequest {
  name: string;
  owner_unit: string;
  data_scale?: string;
  ownership_status?: string;
  source_unit_id?: string;
  operator_id?: string;
}

export interface CompleteStageRequest {
  remark?: string;
  amount?: number;
  buyer?: string;
}

export interface TodoItem {
  id: string;
  asset_id: string;
  dept_id: string;
  stage_name: string;
  title: string;
  status: string;
  deadline?: string;
  asset_name?: string;
  owner_unit?: string;
  created_at?: string;
}

export interface CollaborationRecord {
  id: string;
  asset_id: string;
  from_dept_id: string;
  to_dept_id: string;
  stage_name: string;
  action: string;
  remark?: string;
  asset_name?: string;
  from_dept_name?: string;
  to_dept_name?: string;
  created_at?: string;
}

export interface RevenueRecord {
  id: string;
  asset_id: string;
  amount: number;
  transaction_date: string;
  buyer?: string;
  asset_name?: string;
  created_at?: string;
}

export interface RiskWarning {
  id: string;
  asset_id: string;
  risk_score: number;
  risk_level: string;
  overdue_days: number;
  stage_stuck_days: number;
  response_speed_score: number;
  historical_pass_rate: number;
  status: string;
  suggested_actions?: string;
  handled_by?: string;
  handled_at?: string;
  handling_remark?: string;
  asset_name?: string;
  current_stage?: string;
  owner_unit?: string;
  source_unit_name?: string;
  responsible_dept_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HandleWarningRequest {
  action_type: string;
  remark?: string;
  operator_id?: string;
}

export interface RiskInfo {
  assetId: string;
  riskScore: number;
  riskLevel: string;
  overdueDays: number;
  stageStuckDays: number;
  responseSpeedScore: number;
  historicalPassRate: number;
  suggestedActions: string;
  hasWarning: boolean;
  warnings: RiskWarning[];
  handlingRecords: HandlingRecord[];
  dimensionScores: {
    overdueScore: number;
    stageStuckScore: number;
    responseSpeedScore: number;
    historicalScore: number;
  };
}

export interface HandlingRecord {
  id: string;
  warning_id: string;
  asset_id: string;
  action_type: string;
  remark?: string;
  operator_id?: string;
  operator_name?: string;
  created_at?: string;
}

export interface DashboardData {
  stageStats: Record<string, number>;
  completedCount: number;
  avgDuration: Record<string, number>;
  totalRevenue: number;
  revenueCount: number;
  overdueAssets: OverdueAsset[];
}

export interface OverdueAsset {
  id: string;
  name: string;
  current_stage: string;
  deadline: string;
}

export interface RiskOverview {
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    pending: number;
    handling: number;
  };
  warnings: RiskWarning[];
}

export interface AssetWarningMap {
  [assetId: string]: {
    risk_level: string;
    risk_score: number;
  };
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
