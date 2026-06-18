import React, { useState, useEffect } from "react";
import { Table, Card, Tag, Timeline, Button, message, Space } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { api } from "../services/api";
import dayjs from "dayjs";
import { actionTypeLabels } from "../types/constants";

const Collaborations = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgingIds, setUrgingIds] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await api.getCollaborations();
    setRecords(data.records);
    setLoading(false);
  };

  const handleUrge = async (record) => {
    if (urgingIds.has(record.id)) {
      return;
    }

    setUrgingIds((prev) => new Set([...prev, record.id]));

    try {
      const result = await api.urgeCollaboration(record.id);
      if (result.success) {
        message.success(result.message);
        loadData();
      } else {
        message.error(result.error || "催办失败");
      }
    } catch (error) {
      console.error("Failed to urge collaboration:", error);
      message.error("催办失败，请重试");
    } finally {
      setUrgingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  const columns = [
    { title: "资产名称", dataIndex: "asset_name", key: "asset_name" },
    { title: "阶段", dataIndex: "stage_name", key: "stage_name" },
    { title: "流转来源", dataIndex: "from_dept_name", key: "from_dept_name" },
    { title: "流转去向", dataIndex: "to_dept_name", key: "to_dept_name" },
    {
      title: "操作类型",
      dataIndex: "action",
      key: "action",
      render: (action) => {
        const config = actionTypeLabels[action] || {
          color: "default",
          label: action,
        };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    { title: "备注", dataIndex: "remark", key: "remark" },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => {
        if (record.action === "urge") {
          return <span style={{ color: "#999" }}>已催办</span>;
        }
        return (
          <Button
            type="primary"
            size="small"
            icon={<BellOutlined />}
            loading={urgingIds.has(record.id)}
            onClick={() => handleUrge(record)}
          >
            催办
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <h2>协同台账</h2>

      <Card style={{ marginBottom: 20 }}>
        <Timeline style={{ marginBottom: 20 }}>
          {records.slice(0, 5).map((record, index) => (
            <Timeline.Item key={index}>
              <p>
                <strong>{record.asset_name}</strong> - {record.stage_name}
              </p>
              <p style={{ color: "#666", fontSize: 13 }}>
                {record.from_dept_name} → {record.to_dept_name}
              </p>
              <p style={{ color: "#999", fontSize: 12 }}>
                {dayjs(record.created_at).format("YYYY-MM-DD HH:mm")}
              </p>
            </Timeline.Item>
          ))}
        </Timeline>

        <h3>全部协同记录</h3>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Collaborations;
