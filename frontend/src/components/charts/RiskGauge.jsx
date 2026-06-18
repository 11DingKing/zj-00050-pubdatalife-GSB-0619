import React from "react";
import { Progress, Space, Typography } from "antd";

const { Text } = Typography;

const riskLevelConfig = {
  critical: { color: "#ff4d4f", label: "极高风险" },
  high: { color: "#fa8c16", label: "高风险" },
  medium: { color: "#faad14", label: "中风险" },
  low: { color: "#52c41a", label: "低风险" },
};

const RiskGauge = ({
  score,
  riskLevel,
  showLabel = true,
  size = "default",
}) => {
  const config = riskLevelConfig[riskLevel] || riskLevelConfig.medium;
  const percent = score ? Math.round(score) : 0;

  const getStatusColor = () => {
    if (percent >= 80) return "#52c41a";
    if (percent >= 60) return "#faad14";
    return "#ff4d4f";
  };

  const strokeColor = getStatusColor();

  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <Progress
        type="dashboard"
        percent={percent}
        strokeColor={strokeColor}
        format={(p) => `${p}分`}
        width={size === "small" ? 80 : 120}
      />
      {showLabel && (
        <Text strong style={{ color: config.color }}>
          {config.label}
        </Text>
      )}
    </Space>
  );
};

export default RiskGauge;
