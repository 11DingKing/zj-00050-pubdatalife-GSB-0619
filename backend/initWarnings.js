const { updateAssetRiskWarning } = require("./services/riskService");
const { db } = require("./database");

console.log("Calculating risk scores for all assets...");

const assets = db.prepare("SELECT id, name FROM assets").all();

assets.forEach((asset) => {
  console.log(`Processing: ${asset.name}`);
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
