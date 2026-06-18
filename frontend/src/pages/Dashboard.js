import React, { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Alert, Badge } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "../services/api";
import { LifecycleChart, DeptWorkload } from "../components/charts";
import { riskLevelColors } from "../types/constants";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assetWarningMap, setAssetWarningMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();

    const pollingInterval = setInterval(() => {
      refreshWarnings();
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, []);

  const loadData = async () => {
    try {
      const [data, warningsData] = await Promise.all([
        api.getDashboard(),
        api.getAssetsWithWarnings(),
      ]);
      setDashboardData(data);
      setAssetWarningMap(warningsData.assetWarningMap || {});
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
    setLoading(false);
  };

  const refreshWarnings = async () => {
    try {
      const warningsData = await api.getAssetsWithWarnings();
      setAssetWarningMap(warningsData.assetWarningMap || {});
    } catch (error) {
      console.error("Failed to refresh warnings:", error);
    }
  };

  const handleWarningClick = (assetId) => {
    navigate("/warnings");
  };

  if (loading) return <div>加载中...</div>;
  if (!dashboardData) return <div>数据加载失败，请刷新页面重试</div>;

  const { stageStats, avgDuration, overdueAssets } = dashboardData;
  const completedCount = dashboardData.completedCount || 0;
  const revenueCount = dashboardData.revenueCount || 0;
  const totalRevenue = dashboardData.totalRevenue || 0;

  const overdueColumns = [
    {
      title: "资产名称",
      dataIndex: "name",
      key: "name",
      render: (text, record) => {
        const warning = assetWarningMap[record.id];
        if (warning) {
          return (
            <Badge
              dot
              color={riskLevelColors[warning.risk_level]}
              offset={[5, 0]}
            >
              <span
                style={{ cursor: "pointer", color: "#1890ff" }}
                onClick={() => handleWarningClick(record.id)}
              >
                {text}
              </span>
            </Badge>
          );
        }
        return text;
      },
    },
    { title: "当前阶段", dataIndex: "current_stage", key: "current_stage" },
    {
      title: "截止日期",
      dataIndex: "deadline",
      key: "deadline",
      render: (text) => dayjs(text).format("YYYY-MM-DD"),
    },
  ];

  const totalAssets =
    Object.values(stageStats || {}).reduce((a, b) => a + b, 0) + completedCount;

  return (
    <div>
      <h2>生命周期看板</h2>

      {overdueAssets.length > 0 && (
        <Alert
          message="超期预警"
          description={`有 ${overdueAssets.length} 项资产已超期，请及时处理！`}
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic title="资产总数" value={totalAssets} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={completedCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="交易笔数" value={revenueCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="入库收益"
              value={totalRevenue}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="各阶段资产数量" style={{ marginBottom: 20 }}>
            <LifecycleChart data={stageStats} color="#1890ff" />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="各阶段平均流转时长" style={{ marginBottom: 20 }}>
            <DeptWorkload data={avgDuration} />
          </Card>
        </Col>
      </Row>

      {overdueAssets.length > 0 && (
        <Card title="超期资产预警" style={{ marginTop: 20 }}>
          <Table
            dataSource={overdueAssets}
            columns={overdueColumns}
            rowKey="id"
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
