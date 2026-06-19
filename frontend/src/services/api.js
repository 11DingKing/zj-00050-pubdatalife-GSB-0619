import { assetService } from "./assetService";
import { collaborationService } from "./collaborationService";
import { statisticsService } from "./statisticsService";
import { riskService } from "./riskService";

export const api = {
  getDepartments: assetService.getDepartments.bind(assetService),
  getAssets: assetService.getAssets.bind(assetService),
  getAssetDetail: assetService.getAssetDetail.bind(assetService),
  createAsset: assetService.createAsset.bind(assetService),
  completeStage: assetService.completeStage.bind(assetService),
  getTodos: collaborationService.getTodos.bind(collaborationService),
  getCollaborations:
    collaborationService.getCollaborations.bind(collaborationService),
  urgeCollaboration:
    collaborationService.urgeCollaboration.bind(collaborationService),
  getDashboard: statisticsService.getDashboard.bind(statisticsService),
  getRevenue: statisticsService.getRevenue.bind(statisticsService),
  getRiskWarnings: riskService.getRiskWarnings.bind(riskService),
  getAssetRiskInfo: riskService.getAssetRiskInfo.bind(riskService),
  handleWarning: riskService.handleWarning.bind(riskService),
  reviewWarning: riskService.reviewWarning.bind(riskService),
  recalculateRisk: riskService.recalculateRisk.bind(riskService),
  getRiskOverview: riskService.getRiskOverview.bind(riskService),
  getAssetsWithWarnings: riskService.getAssetsWithWarnings.bind(riskService),
};
