import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const LifecycleChart = ({
  data,
  title = "各阶段资产数量",
  color = "#1890ff",
}) => {
  const chartData = Object.entries(data || {}).map(([name, count]) => ({
    stage: name,
    count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill={color} name="资产数量" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default LifecycleChart;
