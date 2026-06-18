import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Steps,
  Card,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "../services/api";
import dayjs from "dayjs";
import {
  stageColors,
  OWNERSHIP_STATUS,
  DEPARTMENT_TYPES,
} from "../types/constants";

const { Option } = Select;
const { TextArea } = Input;

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [assetsData, deptsData] = await Promise.all([
      api.getAssets(),
      api.getDepartments(),
    ]);
    setAssets(assetsData.assets);
    setDepartments(deptsData.departments);
    setLoading(false);
  };

  const getStageColor = (stage) => {
    return stageColors[stage] || "default";
  };

  const handleCreate = async (values) => {
    await api.createAsset(values);
    message.success("资产创建成功");
    setModalVisible(false);
    form.resetFields();
    loadData();
  };

  const handleViewDetail = async (asset) => {
    const detail = await api.getAssetDetail(asset.id);
    setSelectedAsset(detail);
    setDetailVisible(true);
  };

  const handleCompleteStage = async (values) => {
    const result = await api.completeStage(selectedAsset.asset.id, values);
    message.success(result.message);
    setDetailVisible(false);
    completeForm.resetFields();
    loadData();
  };

  const columns = [
    { title: "数据名称", dataIndex: "name", key: "name" },
    { title: "所属单位", dataIndex: "owner_unit", key: "owner_unit" },
    { title: "数据规模", dataIndex: "data_scale", key: "data_scale" },
    {
      title: "权属状态",
      dataIndex: "ownership_status",
      key: "ownership_status",
      render: (text) => {
        const color =
          text === OWNERSHIP_STATUS.CONFIRMED
            ? "green"
            : text === OWNERSHIP_STATUS.CONFIRMING
              ? "orange"
              : "red";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "所处阶段",
      dataIndex: "current_stage",
      key: "current_stage",
      render: (text) => <Tag color={getStageColor(text)}>{text}</Tag>,
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Button type="link" onClick={() => handleViewDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  const sourceUnits = departments.filter(
    (d) => d.type === DEPARTMENT_TYPES.SOURCE_UNIT,
  );
  const operators = departments.filter(
    (d) => d.type === DEPARTMENT_TYPES.OPERATOR,
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h2>资产目录</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          新增资产
        </Button>
      </div>

      <Table
        dataSource={assets}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="新增数据资产"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="数据名称" rules={[{ required: true }]}>
            <Input placeholder="请输入数据名称" />
          </Form.Item>
          <Form.Item
            name="owner_unit"
            label="所属单位"
            rules={[{ required: true }]}
          >
            <Input placeholder="请输入所属单位" />
          </Form.Item>
          <Form.Item name="data_scale" label="数据规模">
            <Input placeholder="如：50万条" />
          </Form.Item>
          <Form.Item name="ownership_status" label="权属状态">
            <Select placeholder="请选择权属状态">
              <Option value={OWNERSHIP_STATUS.NOT_CONFIRMED}>
                {OWNERSHIP_STATUS.NOT_CONFIRMED}
              </Option>
              <Option value={OWNERSHIP_STATUS.CONFIRMING}>
                {OWNERSHIP_STATUS.CONFIRMING}
              </Option>
              <Option value={OWNERSHIP_STATUS.CONFIRMED}>
                {OWNERSHIP_STATUS.CONFIRMED}
              </Option>
            </Select>
          </Form.Item>
          <Form.Item name="source_unit_id" label="数源单位">
            <Select placeholder="请选择数源单位">
              {sourceUnits.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="operator_id" label="运营机构">
            <Select placeholder="请选择运营机构">
              {operators.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
              创建资产
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资产详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={null}
      >
        {selectedAsset && (
          <div>
            <Card style={{ marginBottom: 20 }}>
              <h3>{selectedAsset.asset.name}</h3>
              <p>所属单位：{selectedAsset.asset.owner_unit}</p>
              <p>数据规模：{selectedAsset.asset.data_scale}</p>
              <p>权属状态：{selectedAsset.asset.ownership_status}</p>
              <p>当前阶段：{selectedAsset.asset.current_stage}</p>
            </Card>

            <Card title="生命周期" style={{ marginBottom: 20 }}>
              <Steps
                direction="vertical"
                current={selectedAsset.stages.findIndex(
                  (s) => s.status === "in_progress",
                )}
              >
                {selectedAsset.stages.map((stage, index) => (
                  <Steps.Step
                    key={index}
                    title={stage.stage_name}
                    status={
                      stage.status === "completed"
                        ? "finish"
                        : stage.status === "in_progress"
                          ? "process"
                          : "wait"
                    }
                    description={
                      <div>
                        <p>责任部门：{stage.responsible_dept_name}</p>
                        {stage.started_at && (
                          <p>
                            开始时间：
                            {dayjs(stage.started_at).format("YYYY-MM-DD")}
                          </p>
                        )}
                        {stage.completed_at && (
                          <p>
                            完成时间：
                            {dayjs(stage.completed_at).format("YYYY-MM-DD")}
                          </p>
                        )}
                        {stage.deadline && stage.status === "in_progress" && (
                          <p>
                            截止日期：
                            {dayjs(stage.deadline).format("YYYY-MM-DD")}
                          </p>
                        )}
                      </div>
                    }
                  />
                ))}
              </Steps>
            </Card>

            {selectedAsset.asset.current_stage !== "已完成" && (
              <Card title="完成当前阶段">
                <Form
                  form={completeForm}
                  layout="vertical"
                  onFinish={handleCompleteStage}
                >
                  <Form.Item name="remark" label="备注">
                    <TextArea rows={3} placeholder="请输入备注信息" />
                  </Form.Item>
                  {selectedAsset.asset.current_stage === "市场交易" && (
                    <>
                      <Form.Item
                        name="amount"
                        label="交易金额（元）"
                        rules={[{ required: true }]}
                      >
                        <Input type="number" placeholder="请输入交易金额" />
                      </Form.Item>
                      <Form.Item name="buyer" label="购买方">
                        <Input placeholder="请输入购买方名称" />
                      </Form.Item>
                    </>
                  )}
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      完成 {selectedAsset.asset.current_stage} 阶段
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assets;
