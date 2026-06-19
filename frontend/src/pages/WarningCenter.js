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
  AuditOutlined,
  RiseOutlined,
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
  const [escalationsVisible, setEscalationsVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [currentEscalations, setCurrentEscalations] = useState([]);
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

  const handleViewEscalations = async (warning) => {
    setSelectedWarning(warning);
    try {
      const data = await api.getWarningEscalations(warning.id);
      setCurrentEscalations(data.escalations || []);
      setEscalationsVisible(true);
    } catch (error) {
      message.error("加载升级记录失败");
    }
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
      message.error(error?.message || "处置失败，请重试");
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
      message.error(error?.message || "复核失败，请重试");
    }
  };

  const getSlaPendingDays = (warning) => {
    if (warning.status !== "pending") return 0;
    const refTime = warning.last_escalated_at || warning.created_at;
    const refDate = dayjs(refTime);
    return dayjs().diff(refDate, "day");
  };

  const columns = [
    {
      title: "闭环状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={warningStatusColors[status]?.color} style={{ margin: 0 }}>
            {warningStatusColors[status]?.label}
          </Tag>
          {record.has_escalated && (
            <Tooltip title={`已升级 ${record.escalation_count} 次`}>
              <Tag color="red" icon={<ArrowUpOutlined />} style={{ margin: 0, marginTop: 2 }}>
                已升级
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "风险等级",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 130,
      render: (level, record) => {
        const config = riskLevelConfig[level];
        const originalLevel = record.original_risk_level;
        return (
          <Space direction="vertical" size={0}>
            <Tag
              color={config?.color}
              style={{ fontWeight: "bold", fontSize: 14, margin: 0 }}
            >
              <ExclamationCircleOutlined /> {config?.label}
            </Tag>
            {originalLevel && originalLevel !== level && (
              <Tooltip title={`原始等级: ${riskLevelConfig[originalLevel]?.label || originalLevel}`}>
                <Tag color="default" style={{ margin: 0, marginTop: 2, fontSize: 12 }}>
                  <RiseOutlined /> 从 {riskLevelConfig[originalLevel]?.label} 升级
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
          <Badge dot color={riskLevelColors[record.risk_level]}>
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Badge>
          {record.status === "pending" && getSlaPendingDays(record) >= 2 && (
            <Tooltip title={`已待处理 ${getSlaPendingDays(record)} 天，${3 - getSlaPendingDays(record)} 天后自动升级`}>
              <ClockCircleOutlined style={{ color: "#ff4d4f" }} />
            </Tooltip>
          )}
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
      title: "超期/停滞",
      key: "days",
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.overdue_days > 0 ? (
            <span style={{ color: "#ff4d4f", fontSize: 12 }}>
              <ClockCircleOutlined /> 超期 {record.overdue_days}天
            </span>
          ) : (
            <span style={{ color: "#52c41a", fontSize: 12 }}>超期正常</span>
          )}
          <span style={{ color: record.stage_stuck_days > 7 ? "#fa8c16" : "#999", fontSize: 12 }}>
            停滞 {record.stage_stuck_days}天
          </span>
        </Space>
      ),
    },
    {
      title: "整改/复核",
      key: "closure",
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
          {record.rectification_result && (
            <Tooltip title={record.rectification_result}>
              <span style={{ color: "#1890ff" }}>
                <CheckCircleOutlined /> 已提交整改
              </span>
            </Tooltip>
          )}
          {record.review_status === "rejected" && record.review_remark && (
            <Tooltip title={`驳回原因: ${record.review_remark}`}>
              <span style={{ color: "#ff4d4f" }}>
                <CloseCircleOutlined /> 复核驳回
              </span>
            </Tooltip>
          )}
          {record.review_status === "approved" && (
            <span style={{ color: "#52c41a" }}>
              <CheckCircleOutlined /> 复核通过
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "建议动作",
      dataIndex: "suggested_actions",
      key: "actions",
      ellipsis: true,
      width: 180,
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
      width: 150,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(text).format("MM-DD HH:mm")}</span>
          {record.has_escalated && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 12, height: "auto" }}
              onClick={() => handleViewEscalations(record)}
            >
              查看升级记录
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => {
        if (record.status === "pending_review") {
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
        if (record.status === "resolved") {
          return <Tag color="green">已闭环</Tag>;
        }
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleWarningAction(record)}
            >
              处置
            </Button>
            {record.has_escalated && (
              <Tooltip title="SLA超时已升级">
                <Tag color="red" icon={<ArrowUpOutlined />}>
                  {record.escalation_count}
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>
        <WarningOutlined style={{ color: "#ff4d4f" }} /> 风险预警中心
        <Tooltip title="SLA规则：待处理预警超过3天未进入处置，自动升级风险等级（低→中→高→极高）">
          <Tag color="orange" style={{ marginLeft: 12, fontSize: 12 }}>
            <ClockCircleOutlined /> SLA 3天自动升级
          </Tag>
        </Tooltip>
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
                title="处置中"
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
                value={overview.stats.pending_review || 0}
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
                prefix={<ArrowUpOutlined style={{ color: "#fa541c" }} />}
                valueStyle={{ color: "#fa541c" }}
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
            <span style={{ fontWeight: 500 }}>闭环状态：</span>
            <Select
              style={{ width: 120 }}
              allowClear
              placeholder="选择状态"
              onChange={(value) => handleFilterChange("status", value)}
            >
              <Option value="pending">待处理</Option>
              <Option value="handling">处置中</Option>
              <Option value="pending_review">待复核</Option>
              <Option value="resolved">已解决</Option>
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
        width={650}
      >
        {selectedWarning && (
          <div style={{ marginBottom: 20 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>资产名称</div>
                <div style={{ fontWeight: 500 }}>
                  {selectedWarning.asset_name}
                  {selectedWarning.has_escalated && (
                    <Tag color="red" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> 已升级 {selectedWarning.escalation_count} 次
                    </Tag>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ color: "#666", marginBottom: 4 }}>当前风险等级</div>
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                  {selectedWarning.original_risk_level && selectedWarning.original_risk_level !== selectedWarning.risk_level && (
                    <span style={{ marginLeft: 4, fontSize: 12, opacity: 0.8 }}>
                      (原: {riskLevelConfig[selectedWarning.original_risk_level]?.label})
                    </span>
                  )}
                </Tag>
              </Col>
            </Row>
            {selectedWarning.rectification_result && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#666", marginBottom: 4 }}>上一次整改结果</div>
                <div style={{ background: "#fff7e6", padding: 10, borderRadius: 4, borderLeft: "3px solid #fa8c16" }}>
                  {selectedWarning.rectification_result}
                  {selectedWarning.review_remark && (
                    <div style={{ marginTop: 8, color: "#ff4d4f", fontSize: 12 }}>
                      <CloseCircleOutlined /> 驳回意见: {selectedWarning.review_remark}
                    </div>
                  )}
                </div>
              </div>
            )}
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
            <TextArea rows={2} placeholder="请输入处置说明（可选）..." />
          </Form.Item>

          <Form.Item
            name="rectification_result"
            label={
              <span>
                <span style={{ color: "#ff4d4f" }}>*</span> 整改结果
                <Tag color="orange" style={{ marginLeft: 8 }}>必填</Tag>
              </span>
            }
            rules={[
              { required: true, message: "请填写整改结果（闭环必需）" },
              { min: 10, message: "整改结果至少10个字，确保处置到位" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="请详细填写整改措施和完成情况，提交后将进入复核流程，复核通过后预警才算正式闭环..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setHandleModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交处置（进入复核）
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
              <Descriptions.Item label="资产名称">{selectedWarning.asset_name}</Descriptions.Item>
              <Descriptions.Item label="风险等级">
                <Tag color={riskLevelConfig[selectedWarning.risk_level]?.color}>
                  {riskLevelConfig[selectedWarning.risk_level]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处置说明">
                <span>{selectedWarning.handling_remark || "无"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="整改结果">
                <div style={{ background: "#f6ffed", padding: 10, borderRadius: 4 }}>
                  {selectedWarning.rectification_result}
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
                  <span>复核通过（闭环）</span>
                </Space>
              </Option>
              <Option value={false}>
                <Space>
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                  <span>驳回重改</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.approved !== currentValues.approved}
          >
            {({ getFieldValue }) =>
              getFieldValue("approved") === false ? (
                <Form.Item
                  name="review_remark"
                  label={
                    <span>
                      <span style={{ color: "#ff4d4f" }}>*</span> 驳回意见
                    </span>
                  }
                  rules={[{ required: true, message: "驳回时必须填写意见" }]}
                >
                  <TextArea rows={3} placeholder="请说明驳回原因，要求重新处置..." />
                </Form.Item>
              ) : (
                <Form.Item name="review_remark" label="复核备注（可选）">
                  <TextArea rows={2} placeholder="可以填写复核确认意见..." />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交复核结果
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="预警升级记录"
        open={escalationsVisible}
        onCancel={() => setEscalationsVisible(false)}
        footer={null}
        width={550}
      >
        {currentEscalations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            暂无升级记录
          </div>
        ) : (
          <Timeline
            items={currentEscalations.map((esc) => ({
              color: "red",
              children: (
                <div>
                  <Space>
                    <Tag color={riskLevelConfig[esc.from_level]?.color}>
                      {riskLevelConfig[esc.from_level]?.label}
                    </Tag>
                    <ArrowUpOutlined style={{ color: "#ff4d4f" }} />
                    <Tag color={riskLevelConfig[esc.to_level]?.color}>
                      {riskLevelConfig[esc.to_level]?.label}
                    </Tag>
                  </Space>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                    {dayjs(esc.escalated_at).format("YYYY-MM-DD HH:mm")}
                  </div>
                  <div style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
                    {esc.reason}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Modal>
    </div>
  );
};

export default WarningCenter;
