import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Input,
  Space,
  Badge,
  Tooltip,
  message,
} from "antd";
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { api } from "../services/api";
import { RiskGauge } from "../components/charts";
import dayjs from "dayjs";
import {
  riskLevelColors,
  warningStatusColors,
  actionTypeLabels,
  STAGES,
} from "../types/constants";

const { Option } = Select;
const { TextArea } = Input;

const riskLevelConfig = {
  critical: { color: "#ff4d4f", label: "极高", bgColor: "#fff1f0" },
  high: { color: "#fa8c16", label: "高", bgColor: "#fff7e6" },
  medium: { color: "#faad14", label: "中", bgColor: "#fffbe6" },
  low: { color: "#52c41a", label: "低", bgColor: "#f6ffed" },
};

const WarningCenter = () => {
  const [warnings, setWarnings] = useState([]);
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadFilteredData();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [overviewData, deptData] = await Promise.all([
        api.getRiskOverview(),
        api.getDepartments(),
      ]);
      setOverview(overviewData);
      setDepartments(deptData.departments || []);
      loadWarnings();
    } catch (error) {
      console.error("Failed to load data:", error);
      message.error("加载数据失败");
    }
  };

  const loadFilteredData = async () => {
    setLoading(true);
    try {
      const [overviewData, warningsData] = await Promise.all([
        api.getRiskOverview(filters),
        api.getRiskWarnings(filters),
      ]);
      setOverview(overviewData);
      setWarnings(warningsData.warnings || []);
    } catch (error) {
      console.error("Failed to load filtered data:", error);
      message.error("加载数据失败");
    }
    setLoading(false);
  };

  const loadWarnings = async () => {
    setLoading(true);
    try {
      const data = await api.getRiskWarnings(filters);
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error("Failed to load warnings:", error);
      message.error("加载预警列表失败");
    }
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleWarningAction = (warning) => {
    setSelectedWarning(warning);
    form.resetFields();
    setHandleModalVisible(true);
  };

  const handleReviewAction = (warning) => {
    setSelectedWarning(warning);
    reviewForm.resetFields();
    setReviewModalVisible(true);
  };

  const submitHandle = async (values) => {
    try {
      const result = await api.handleWarning(selectedWarning.id, {
        action_type: values.action_type,
        remark: values.remark,
        rectification_result: values.rectification_result,
      });
      if (result.success) {
        message.success(result.message || "处置已提交，等待复核闭环");
        setHandleModalVisible(false);
        loadFilteredData();
      } else {
        message.error(result.error || "处置失败");
      }
    } catch (error) {
      console.error("Failed to handle warning:", error);
      message.error(error?.message || "处置失败，请重试");
    }
  };

  const submitReview = async (values) => {
    try {
      const result = await api.reviewWarning(selectedWarning.id, {
        decision: values.decision,
        review_remark: values.review_remark,
      });
      if (result.success) {
        message.success(result.message || "复核已提交");
        setReviewModalVisible(false);
        loadFilteredData();
      } else {
        message.error(result.error || "复核失败");
      }
    } catch (error) {
      console.error("Failed to review warning:", error);
      message.error(error?.message || "复核失败，请重试");
    }
  };

  const columns = [
    {
      title: "预警状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) => (
        <Tag color={warningStatusColors[status]?.color}>
          {warningStatusColors[status]?.label}
        </Tag>
      ),
    },
    {
      title: "风险等级",
      key: "risk_level",
      width: 140,
      render: (_, record) => {
        const effectiveLevel = record.effective_risk_level || record.risk_level;
        const config = riskLevelConfig[effectiveLevel];
        const isEscalated =
          record.is_escalated ||
          (record.escalation_count && record.escalation_count > 0);
        return (
          <Space direction="vertical" size={2}>
            <Tag
              color={config?.color}
              style={{ fontWeight: "bold", fontSize: 14 }}
            >
              <ExclamationCircleOutlined /> {config?.label}
            </Tag>
            {isEscalated && (
              <Tooltip
                title={`已自动升级 ${record.escalation_count} 次（原 ${
                  riskLevelConfig[record.risk_level]?.label || record.risk_level
                }）`}
              >
                <Tag color="volcano" style={{ marginRight: 0 }}>
                  <RiseOutlined /> SLA升级×{record.escalation_count}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: "风险评分",
      dataIndex: "risk_score",
      key: "risk_score",
      width: 120,
      render: (score, record) => (
        <RiskGauge
          score={score}
          riskLevel={record.risk_level}
          showLabel={false}
          size="small"
        />
      ),
    },
    {
      title: "资产名称",
      dataIndex: "asset_name",
      key: "asset_name",
      width: 180,
      render: (text, record) => (
        <Space>
          <Badge
            dot
            color={
              riskLevelColors[record.effective_risk_level || record.risk_level]
            }
          >
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Badge>
        </Space>
      ),
    },
    {
      title: "所属部门",
      dataIndex: "responsible_dept_name",
      key: "dept",
      width: 120,
    },
    {
      title: "当前阶段",
      dataIndex: "current_stage",
      key: "stage",
      width: 120,
      render: (stage) => <Tag color="blue">{stage}</Tag>,
    },
    {
      title: "超期天数",
      dataIndex: "overdue_days",
      key: "overdue",
      width: 100,
      render: (days) =>
        days > 0 ? (
          <span style={{ color: "#ff4d4f" }}>
            <ClockCircleOutlined /> {days}天
          </span>
        ) : (
          <span style={{ color: "#52c41a" }}>正常</span>
        ),
    },
    {
      title: "停滞天数",
      dataIndex: "stage_stuck_days",
      key: "stuck",
      width: 100,
      render: (days) => (
        <span style={{ color: days > 7 ? "#fa8c16" : "inherit" }}>
          {days}天
        </span>
      ),
    },
    {
      title: "建议动作",
      dataIndex: "suggested_actions",
      key: "actions",
      ellipsis: true,
      width: 200,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "闭环状态",
      key: "closed_loop",
      width: 160,
      render: (_, record) => {
        if (record.status === "resolved") {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              已闭环
            </Tag>
          );
        }
        if (record.status === "reviewing") {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="purple">待复核</Tag>
              {record.rectification_result && (
                <Tooltip title={record.rectification_result}>
                  <span style={{ color: "#666", fontSize: 12 }}>
                    已填整改结果
                  </span>
                </Tooltip>
              )}
            </Space>
          );
        }
        if (record.review_status === "rejected") {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              复核退回
            </Tag>
          );
        }
        return <Tag color="default">未处置</Tag>;
      },
    },
    {
      title: "预警时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, record) => {
        if (record.status === "resolved") {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              已闭环
            </Tag>
          );
        }
        if (record.status === "reviewing") {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReviewAction(record)}
            >
              复核
            </Button>
          );
        }
        return (
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => handleWarningAction(record)}
          >
            处置
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>
        <WarningOutlined style={{ color: "#ff4d4f" }} /> 风险预警中心
      </h2>

      {overview && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={3}>
            <Card>
              <Statistic
                title="预警总数"
                value={overview.stats.total}
                prefix={<BellOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="极高风险"
                value={overview.stats.critical}
                prefix={
                  <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
                }
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="高风险"
                value={overview.stats.high}
                prefix={
                  <ExclamationCircleOutlined style={{ color: "#fa8c16" }} />
                }
                valueStyle={{ color: "#fa8c16" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="中风险"
                value={overview.stats.medium}
                prefix={
                  <ExclamationCircleOutlined style={{ color: "#faad14" }} />
                }
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="待处理"
                value={overview.stats.pending}
                prefix={<ClockCircleOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="处理中"
                value={overview.stats.handling}
                prefix={<TeamOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="待复核"
                value={overview.stats.reviewing || 0}
                prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="已SLA升级"
                value={overview.stats.escalated || 0}
                prefix={<RiseOutlined style={{ color: "#fa541c" }} />}
                valueStyle={{ color: "#fa541c" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={{ marginBottom: 20 }}>
        <Space wrap size="large">
          <Space>
            <span style={{ fontWeight: 500 }}>责任部门：</span>
            <Select
              style={{ width: 150 }}
              allowClear
              placeholder="选择部门"
              onChange={(value) => handleFilterChange("dept_id", value)}
            >
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Space>

          <Space>
            <span style={{ fontWeight: 500 }}>风险等级：</span>
            <Select
              style={{ width: 120 }}
              allowClear
              placeholder="选择等级"
              onChange={(value) => handleFilterChange("risk_level", value)}
            >
              <Option value="critical">极高</Option>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Space>

          <Space>
            <span style={{ fontWeight: 500 }}>当前阶段：</span>
            <Select
              style={{ width: 140 }}
              allowClear
              placeholder="选择阶段"
              onChange={(value) => handleFilterChange("stage", value)}
            >
              {STAGES.map((stage) => (
                <Option key={stage.name} value={stage.name}>
                  {stage.name}
                </Option>
              ))}
            </Select>
          </Space>

          <Space>
            <span style={{ fontWeight: 500 }}>处理状态：</span>
            <Select
              style={{ width: 120 }}
              allowClear
              placeholder="选择状态"
              onChange={(value) => handleFilterChange("status", value)}
            >
              <Option value="pending">待处理</Option>
              <Option value="handling">处理中</Option>
              <Option value="reviewing">待复核</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </Space>

          <Button onClick={loadFilteredData} type="primary">
            刷新
          </Button>
        </Space>
      </Card>

      <Card title="预警列表">
        <Table
          columns={columns}
          dataSource={warnings}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条预警`,
          }}
        />
      </Card>

      <Modal
        title="预警处置"
        open={handleModalVisible}
        onCancel={() => setHandleModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedWarning && (
          <div style={{ marginBottom: 20 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>资产名称</div>
                <div style={{ fontWeight: 500 }}>
                  {selectedWarning.asset_name}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>风险等级</div>
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ color: "#666", marginBottom: 4 }}>建议动作</div>
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 4,
                  }}
                >
                  {selectedWarning.suggested_actions || "暂无建议"}
                </div>
              </Col>
            </Row>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={submitHandle}>
          <Form.Item
            name="action_type"
            label="处置方式"
            rules={[{ required: true, message: "请选择处置方式" }]}
          >
            <Select placeholder="请选择处置方式">
              <Option value="urge">
                <Space>
                  <BellOutlined />
                  <span>催办</span>
                </Space>
              </Option>
              <Option value="meeting">
                <Space>
                  <TeamOutlined />
                  <span>组织协调会</span>
                </Space>
              </Option>
              <Option value="direct_advance">
                <Space>
                  <ThunderboltOutlined />
                  <span>直接推进（流转至下一阶段）</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="处置说明">
            <TextArea rows={3} placeholder="请输入处置说明..." />
          </Form.Item>

          <Form.Item
            name="rectification_result"
            label="整改结果"
            rules={[
              {
                required: true,
                message: "请填写整改结果，处置必须形成闭环",
              },
            ]}
            extra="提交后预警进入待复核状态，需复核通过才能闭环"
          >
            <TextArea
              rows={4}
              placeholder="请详细描述整改情况、措施和效果..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setHandleModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交处置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="预警复核"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedWarning && (
          <div style={{ marginBottom: 20 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>资产名称</div>
                <div style={{ fontWeight: 500 }}>
                  {selectedWarning.asset_name}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>风险等级</div>
                <Tag
                  color={
                    riskLevelConfig[
                      selectedWarning.effective_risk_level ||
                        selectedWarning.risk_level
                    ]?.color
                  }
                >
                  {
                    riskLevelConfig[
                      selectedWarning.effective_risk_level ||
                        selectedWarning.risk_level
                    ]?.label
                  }
                </Tag>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <div style={{ color: "#666", marginBottom: 4 }}>处置说明</div>
                <div
                  style={{
                    background: "#fafafa",
                    padding: 12,
                    borderRadius: 4,
                  }}
                >
                  {selectedWarning.handling_remark || "无"}
                </div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ color: "#666", marginBottom: 4 }}>整改结果</div>
                <div
                  style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    padding: 12,
                    borderRadius: 4,
                  }}
                >
                  {selectedWarning.rectification_result || "无"}
                </div>
              </Col>
            </Row>
          </div>
        )}

        <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
          <Form.Item
            name="decision"
            label="复核结论"
            rules={[{ required: true, message: "请选择复核结论" }]}
          >
            <Select placeholder="请选择复核结论">
              <Option value="approved">
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  <span>通过（闭环）</span>
                </Space>
              </Option>
              <Option value="rejected">
                <Space>
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                  <span>退回（重新处置）</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item name="review_remark" label="复核说明">
            <TextArea rows={4} placeholder="请输入复核说明..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交复核
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WarningCenter;
