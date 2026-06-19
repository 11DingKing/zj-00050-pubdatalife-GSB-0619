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
  Popover,
  Timeline,
  Descriptions,
  Alert,
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
  RollbackOutlined,
  AuditOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { api } from "../services/api";
import { RiskGauge } from "../components/charts";
import dayjs from "dayjs";
import {
  riskLevelColors,
  warningStatusColors,
  actionTypeLabels,
  STAGES,
  closureStatusLabels,
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
  const [rectifyModalVisible, setRectifyModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [escalationLogs, setEscalationLogs] = useState([]);
  const [handleForm] = Form.useForm();
  const [rectifyForm] = Form.useForm();
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

  const loadEscalationLogs = async (warningId) => {
    try {
      const data = await api.getEscalationLogs(warningId);
      setEscalationLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to load escalation logs:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleWarningAction = (warning) => {
    setSelectedWarning(warning);
    handleForm.resetFields();
    setHandleModalVisible(true);
  };

  const handleRectifyAction = (warning) => {
    setSelectedWarning(warning);
    rectifyForm.resetFields();
    setRectifyModalVisible(true);
  };

  const handleReviewAction = (warning) => {
    setSelectedWarning(warning);
    reviewForm.resetFields();
    loadEscalationLogs(warning.id);
    setReviewModalVisible(true);
  };

  const submitHandle = async (values) => {
    try {
      const result = await api.handleWarning(selectedWarning.id, {
        action_type: values.action_type,
        remark: values.remark,
      });
      if (result.success) {
        message.success("处置已记录，状态已更新为处理中，请提交整改结果");
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

  const submitRectification = async (values) => {
    try {
      const result = await api.submitRectification(selectedWarning.id, {
        rectification_result: values.rectification_result,
        remark: values.remark,
      });
      if (result.success) {
        message.success("整改结果已提交，等待复核");
        setRectifyModalVisible(false);
        loadFilteredData();
      } else {
        message.error(result.error || "提交整改失败");
      }
    } catch (error) {
      console.error("Failed to submit rectification:", error);
      message.error("提交整改失败，请重试");
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
    const count = record.escalation_count || 0;
    if (count === 0) return null;

    const logsContent = (
      <div style={{ maxWidth: 300, maxHeight: 200, overflow: "auto" }}>
        <Timeline
          size="small"
          items={escalationLogs.length > 0 ? escalationLogs.map((log) => ({
            color: "red",
            children: (
              <div>
                <div>
                  {riskLevelConfig[log.from_level]?.label} →{" "}
                  <strong>{riskLevelConfig[log.to_level]?.label}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {dayjs(log.escalated_at).format("YYYY-MM-DD HH:mm")}
                </div>
                <div style={{ fontSize: 12 }}>{log.reason}</div>
              </div>
            ),
          })) : [
            {
              color: "red",
              children: "已升级 " + count + " 次（点击查看详情）",
            },
          ]}
        />
      </div>
    );

    return (
      <Popover
        content={logsContent}
        title="升级记录"
        trigger="click"
        onOpenChange={(visible) => {
          if (visible) loadEscalationLogs(record.id);
        }}
      >
        <Tag color="red" style={{ cursor: "pointer", marginLeft: 4 }}>
          <ArrowUpOutlined /> 已升级{count}次
        </Tag>
      </Popover>
    );
  };

  const columns = [
    {
      title: "闭环状态",
      dataIndex: "status",
      key: "closure_status",
      width: 110,
      render: (status, record) => {
        const statusConfig = warningStatusColors[status];
        const closureLabel = closureStatusLabels[status];
        return (
          <Space direction="vertical" size={0}>
            <Tag color={statusConfig?.color} style={{ margin: 0 }}>
              {statusConfig?.label}
            </Tag>
            {renderEscalationBadge(record)}
          </Space>
        );
      },
    },
    {
      title: "风险等级",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 100,
      render: (level, record) => {
        const config = riskLevelConfig[level];
        const isEscalated = (record.escalation_count || 0) > 0;
        const originalConfig = record.original_risk_level
          ? riskLevelConfig[record.original_risk_level]
          : null;
        return (
          <Space direction="vertical" size={0}>
            <Tag
              color={config?.color}
              style={{ fontWeight: "bold", fontSize: 14, margin: 0 }}
            >
              <ExclamationCircleOutlined /> {config?.label}
            </Tag>
            {isEscalated && originalConfig && record.original_risk_level !== level && (
              <span style={{ fontSize: 12, color: "#999" }}>
                原等级: {originalConfig.label}
              </span>
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
          <Badge dot color={riskLevelColors[record.risk_level]}>
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
      title: "整改结果",
      dataIndex: "rectification_result",
      key: "rectification",
      width: 150,
      ellipsis: true,
      render: (text, record) => {
        if (record.status === "reviewing" || record.status === "resolved") {
          return (
            <Tooltip title={text}>
              <span>
                <FileTextOutlined style={{ marginRight: 4 }} />
                {text ? (text.length > 10 ? text.substring(0, 10) + "..." : text) : "-"}
              </span>
            </Tooltip>
          );
        }
        return <span style={{ color: "#ccc" }}>待整改</span>;
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
      width: 200,
      fixed: "right",
      render: (_, record) => {
        if (record.status === "pending") {
          return (
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleWarningAction(record)}
            >
              开始处置
            </Button>
          );
        }
        if (record.status === "handling") {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleRectifyAction(record)}
              >
                提交整改
              </Button>
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => handleWarningAction(record)}
              >
                补充处置
              </Button>
            </Space>
          );
        }
        if (record.status === "reviewing") {
          return (
            <Button
              type="primary"
              size="small"
              icon={<AuditOutlined />}
              onClick={() => handleReviewAction(record)}
            >
              复核
            </Button>
          );
        }
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            已闭环
          </Tag>
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
                title="待响应"
                value={overview.stats.pending}
                prefix={<ClockCircleOutlined style={{ color: "#ff4d4f" }} />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="整改中"
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
                prefix={<AuditOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="已升级"
                value={overview.stats.escalated || 0}
                prefix={<ArrowUpOutlined style={{ color: "#cf1322" }} />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card>
              <Statistic
                title="已闭环"
                value={overview.stats.total - overview.stats.pending - overview.stats.handling - (overview.stats.reviewing || 0)}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a" }}
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
            <span style={{ fontWeight: 500 }}>闭环状态：</span>
            <Select
              style={{ width: 120 }}
              allowClear
              placeholder="选择状态"
              onChange={(value) => handleFilterChange("status", value)}
            >
              <Option value="pending">待响应</Option>
              <Option value="handling">整改中</Option>
              <Option value="reviewing">待复核</Option>
              <Option value="resolved">已闭环</Option>
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
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="资产名称" span={2}>
                {selectedWarning.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="当前等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
                {(selectedWarning.escalation_count || 0) > 0 && (
                  <Tag color="red" style={{ marginLeft: 4 }}>
                    <ArrowUpOutlined /> 已升级{selectedWarning.escalation_count}次
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={warningStatusColors[selectedWarning.status]?.color}>
                  {warningStatusColors[selectedWarning.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="建议动作" span={2}>
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  {selectedWarning.suggested_actions || "暂无建议"}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        <Form form={handleForm} layout="vertical" onFinish={submitHandle}>
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
            <TextArea rows={4} placeholder="请输入处置说明..." />
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
        title="提交整改结果"
        open={rectifyModalVisible}
        onCancel={() => setRectifyModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedWarning && (
          <div style={{ marginBottom: 20 }}>
            <Alert
              message="处置闭环提醒"
              description="请详细填写整改结果，提交后将进入复核流程，复核通过才算闭环。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="资产名称" span={2}>
                {selectedWarning.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处置状态">
                <Tag color={warningStatusColors[selectedWarning.status]?.color}>
                  {warningStatusColors[selectedWarning.status]?.label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        <Form form={rectifyForm} layout="vertical" onFinish={submitRectification}>
          <Form.Item
            name="rectification_result"
            label="整改结果"
            rules={[{ required: true, message: "请填写整改结果" }]}
          >
            <TextArea
              rows={5}
              placeholder="请详细描述整改措施和结果，例如：已协调相关部门完成数据清洗，资产已流转至下一阶段..."
            />
          </Form.Item>

          <Form.Item name="remark" label="补充说明">
            <TextArea rows={2} placeholder="其他需要说明的情况（选填）" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setRectifyModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交整改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="复核预警"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedWarning && (
          <div style={{ marginBottom: 20 }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="资产名称" span={2}>
                {selectedWarning.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={warningStatusColors[selectedWarning.status]?.color}>
                  {warningStatusColors[selectedWarning.status]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="整改结果" span={2}>
                <div
                  style={{
                    background: "#f6ffed",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #b7eb8f",
                  }}
                >
                  {selectedWarning.rectification_result || "-"}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {escalationLogs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>
                  <ArrowUpOutlined style={{ color: "#ff4d4f" }} /> 升级记录
                </div>
                <Timeline
                  items={escalationLogs.map((log) => ({
                    color: "red",
                    children: (
                      <div>
                        <div>
                          {riskLevelConfig[log.from_level]?.label} →{" "}
                          <strong>{riskLevelConfig[log.to_level]?.label}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "#999" }}>
                          {dayjs(log.escalated_at).format("YYYY-MM-DD HH:mm")}
                        </div>
                        <div style={{ fontSize: 12 }}>{log.reason}</div>
                      </div>
                    ),
                  }))}
                />
              </div>
            )}
          </div>
        )}

        <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
          <Form.Item
            name="approved"
            label="复核结果"
            rules={[{ required: true, message: "请选择复核结果" }]}
          >
            <Select placeholder="请选择复核结果">
              <Option value={true}>
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  <span>复核通过（闭环预警）</span>
                </Space>
              </Option>
              <Option value={false}>
                <Space>
                  <RollbackOutlined style={{ color: "#ff4d4f" }} />
                  <span>驳回（退回重新整改）</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="review_remark"
            label="复核意见"
            rules={[{ required: true, message: "请填写复核意见" }]}
          >
            <TextArea
              rows={3}
              placeholder="请填写复核意见，如通过请说明确认依据，如驳回请说明原因..."
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
    </div>
  );
};

export default WarningCenter;
