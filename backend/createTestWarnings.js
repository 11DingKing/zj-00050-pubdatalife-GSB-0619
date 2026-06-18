const { db } = require("./database");
const { updateAssetRiskWarning } = require("./services/riskService");

console.log("Creating test data with overdue assets...");

const now = new Date();

const overdueDeadline = new Date();
overdueDeadline.setDate(overdueDeadline.getDate() - 15);

const longAgoStarted = new Date();
longAgoStarted.setDate(longAgoStarted.getDate() - 25);

db.prepare(
  `
  UPDATE lifecycle_stages 
  SET deadline = ?, started_at = ?
  WHERE stage_name = '清洗加工' AND status = 'in_progress'
`,
).run(overdueDeadline.toISOString(), longAgoStarted.toISOString());

db.prepare(
  `
  UPDATE lifecycle_stages 
  SET deadline = ?, started_at = ?
  WHERE stage_name = '知识产权登记' AND status = 'in_progress'
`,
).run(overdueDeadline.toISOString(), longAgoStarted.toISOString());

console.log("Updated deadlines to create overdue warnings");

const assets = db.prepare("SELECT id, name FROM assets").all();

assets.forEach((asset) => {
  console.log(`Recalculating: ${asset.name}`);
  const result = updateAssetRiskWarning(asset.id);
  if (result && result.warningId) {
    console.log(
      `  -> Warning created! Score: ${result.riskScore}, Level: ${result.riskLevel}`,
    );
  } else if (result) {
    console.log(`  -> No warning. Score: ${result.riskScore}`);
  }
});

console.log("Done!");
