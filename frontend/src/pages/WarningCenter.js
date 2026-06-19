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
  Descriptions,
  Timeline,
} from "antd";
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { api } from "../services/api";
import { RiskGauge } from "../components/charts";
import dayjs from "dayjs";
import {
  warningStatusColors,
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [escalationLogs, setEscalationLogs] = useState([]);
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

  const handleViewDetail = async (warning) => {
    setSelectedWarning(warning);
    try {
      const logsData = await api.getEscalationLogs(warning.id);
      setEscalationLogs(logsData.logs || []);
    } catch (error) {
      setEscalationLogs([]);
    }
    setDetailModalVisible(true);
  };

  const submitHandle = async (values) => {
    try {
      const result = await api.handleWarning(selectedWarning.id, {
        action_type: values.action_type,
        remark: values.remark,
        rectification_result: values.rectification_result,
      });
      if (result.success) {
        message.success("处置已提交，等待复核确认");
        setHandleModalVisible(false);
        loadFilteredData();
      } else {
        message.error(result.error || "处置失败");
      }
    } catch (error) {
      console.error("Failed to handle warning:", error);
      message.error("处置失败，请重试");
    }
  };

  const submitReview = async (values) => {
    try {
      const result = await api.reviewWarning(selectedWarning.id, {
        approved: values.approved,
        review_remark: values.review_remark,
      });
      if (result.success) {
        message.success(result.message);
        setReviewModalVisible(false);
        loadFilteredData();
      } else {
        message.error(result.error || "复核失败");
      }
    } catch (error) {
      console.error("Failed to review warning:", error);
      message.error("复核失败，请重试");
    }
  };

  const renderEscalationBadge = (record) => {
    if (!record.escalation_count || record.escalation_count <= 0) return null;
    return (
      <Tooltip title={`已自动升级 ${record.escalation_count} 次`}>
        <Tag color="red" style={{ marginLeft: 4 }}>
          <ArrowUpOutlined /> 升{record.escalation_count}级
        </Tag>
      </Tooltip>
    );
  };

  const renderRiskLevel = (level, record) => {
    const config = riskLevelConfig[level];
    const isEscalated = record.escalation_count > 0;
    return (
      <Space size={4} direction="vertical">
        <Tag
          color={config?.color}
          style={{ fontWeight: "bold", fontSize: 14 }}
        >
          <ExclamationCircleOutlined /> {config?.label}
        </Tag>
        {isEscalated && record.original_risk_level && (
          <span style={{ fontSize: 12, color: "#999" }}>
            原等级: {riskLevelConfig[record.original_risk_level]?.label}
          </span>
        )}
      </Space>
    );
  };

  const columns = [
    {
      title: "预警状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={warningStatusColors[status]?.color}>
            {warningStatusColors[status]?.label}
          </Tag>
          {renderEscalationBadge(record)}
        </Space>
      ),
    },
    {
      title: "风险等级",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 120,
      render: (level, record) => renderRiskLevel(level, record),
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
          <Badge dot color={riskLevelConfig[record.risk_level]?.color}>
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
      title: "预警时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === "pending" || record.status === "handling" ? (
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleWarningAction(record)}
            >
              处置
            </Button>
          ) : null}
          {record.status === "pending_review" ? (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReviewAction(record)}
              style={{ background: "#722ed1", borderColor: "#722ed1" }}
            >
              复核
            </Button>
          ) : null}
        </Space>
      ),
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
                value={overview.stats.pending_review}
                prefix={
                  <CheckCircleOutlined style={{ color: "#722ed1" }} />
                }
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="已升级"
                value={overview.stats.escalated}
                prefix={<ArrowUpOutlined style={{ color: "#cf1322" }} />}
                valueStyle={{ color: "#cf1322" }}
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
              <Option value="pending_review">待复核</Option>
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
          scroll={{ x: 1600 }}
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
                {selectedWarning.escalation_count > 0 && (
                  <Tag color="red" style={{ marginLeft: 4 }}>
                    已升级{selectedWarning.escalation_count}次
                  </Tag>
                )}
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
            rules={[{ required: true, message: "请填写整改结果" }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细填写整改结果，提交后需经复核才能关闭预警..."
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
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="资产名称">
                {selectedWarning.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处置方式">
                {selectedWarning.handling_remark ? "已处置" : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="整改结果">
                <div
                  style={{
                    background: "#f6ffed",
                    padding: 10,
                    borderRadius: 4,
                    border: "1px solid #b7eb8f",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedWarning.rectification_result || "-"}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
          <Form.Item
            name="approved"
            label="复核结论"
            rules={[{ required: true, message: "请选择复核结论" }]}
          >
            <Select placeholder="请选择复核结论">
              <Option value={true}>
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  <span>复核通过，关闭预警</span>
                </Space>
              </Option>
              <Option value={false}>
                <Space>
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                  <span>复核不通过，退回重新处置</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="review_remark"
            label="复核意见"
            rules={[
              {
                required: true,
                message: "请填写复核意见（驳回时必须说明原因）",
              },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请填写复核意见，如驳回请说明退回原因..."
            />
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

      <Modal
        title="预警详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedWarning && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="资产名称" span={2}>
                {selectedWarning.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                <Tag color="blue">{selectedWarning.current_stage}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="责任部门">
                {selectedWarning.responsible_dept_name}
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
                {selectedWarning.escalation_count > 0 && (
                  <Tag color="red" style={{ marginLeft: 4 }}>
                    <ArrowUpOutlined /> 已升级{selectedWarning.escalation_count}次
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="预警状态">
                <Tag color={warningStatusColors[selectedWarning.status]?.color}>
                  {warningStatusColors[selectedWarning.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="风险评分">
                {selectedWarning.risk_score}
              </Descriptions.Item>
              <Descriptions.Item label="超期/停滞">
                {selectedWarning.overdue_days > 0
                  ? `超期${selectedWarning.overdue_days}天`
                  : "正常"}{" "}
                / 停滞{selectedWarning.stage_stuck_days}天
              </Descriptions.Item>
              <Descriptions.Item label="预警时间">
                {dayjs(selectedWarning.created_at).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
              {selectedWarning.rectification_result && (
                <Descriptions.Item label="整改结果" span={2}>
                  <div
                    style={{
                      background: "#f6ffed",
                      padding: 10,
                      borderRadius: 4,
                      border: "1px solid #b7eb8f",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedWarning.rectification_result}
                  </div>
                </Descriptions.Item>
              )}
              {selectedWarning.review_remark && (
                <Descriptions.Item label="复核意见" span={2}>
                  <div
                    style={{
                      background: selectedWarning.status === "resolved" ? "#f6ffed" : "#fff2f0",
                      padding: 10,
                      borderRadius: 4,
                      border: selectedWarning.status === "resolved" ? "1px solid #b7eb8f" : "1px solid #ffccc7",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedWarning.review_remark}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>

            {escalationLogs.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 12 }}>
                  <ArrowUpOutlined style={{ color: "#cf1322" }} /> SLA升级记录
                </h4>
                <Timeline
                  items={escalationLogs.map((log) => ({
                    color: "red",
                    children: (
                      <div>
                        <div>
                          {dayjs(log.created_at).format("YYYY-MM-DD HH:mm")} -{" "}
                          <Tag>{riskLevelConfig[log.old_level]?.label}</Tag>
                          <ArrowUpOutlined />
                          <Tag color="red">
                            {riskLevelConfig[log.new_level]?.label}
                          </Tag>
                        </div>
                        <div style={{ color: "#666", fontSize: 12 }}>
                          {log.reason}（待处理{log.days_pending}天）
                        </div>
                      </div>
                    ),
                  }))}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WarningCenter;
