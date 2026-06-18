import React, { useState, useEffect } from "react";
import { Table, Select, Card, Tag, Badge } from "antd";
import { api } from "../services/api";
import dayjs from "dayjs";
import { DEPARTMENT_TYPES, statusColors } from "../types/constants";

const { Option } = Select;

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadTodos();
  }, [selectedDept]);

  const loadDepartments = async () => {
    const data = await api.getDepartments();
    setDepartments(data.departments);
  };

  const loadTodos = async () => {
    setLoading(true);
    const data = await api.getTodos(selectedDept);
    setTodos(data.todos);
    setLoading(false);
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return dayjs(deadline).isBefore(dayjs());
  };

  const columns = [
    {
      title: "待办标题",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <Badge
          dot={isOverdue(record.deadline) && record.status === "pending"}
          status="error"
        >
          {text}
        </Badge>
      ),
    },
    { title: "资产名称", dataIndex: "asset_name", key: "asset_name" },
    { title: "所属单位", dataIndex: "owner_unit", key: "owner_unit" },
    { title: "阶段", dataIndex: "stage_name", key: "stage_name" },
    {
      title: "截止日期",
      dataIndex: "deadline",
      key: "deadline",
      render: (text, record) => {
        if (!text) return "-";
        const overdue = isOverdue(text);
        return (
          <Tag color={overdue ? "red" : "blue"}>
            {dayjs(text).format("YYYY-MM-DD")}
          </Tag>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (text) => {
        const config = statusColors[text] || {
          color: "default",
          label: text,
        };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  const mainDepts = departments.filter((d) =>
    [
      DEPARTMENT_TYPES.DATA_BUREAU,
      DEPARTMENT_TYPES.FINANCE_BUREAU,
      DEPARTMENT_TYPES.MARKET_REGULATOR,
      DEPARTMENT_TYPES.OPERATOR,
    ].includes(d.type),
  );

  return (
    <div>
      <h2>部门待办</h2>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 12 }}>选择部门：</span>
          <Select
            style={{ width: 200 }}
            placeholder="全部部门"
            allowClear
            onChange={setSelectedDept}
          >
            {mainDepts.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.name}
              </Option>
            ))}
          </Select>
        </div>

        <Table
          dataSource={todos}
          columns={columns}
          rowKey="id"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Todos;
