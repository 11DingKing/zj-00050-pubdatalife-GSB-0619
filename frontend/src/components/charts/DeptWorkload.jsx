import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const DeptWorkload = ({ data, title = "各阶段平均流转时长" }) => {
  const chartData = Object.entries(data || {}).map(([name, days]) => ({
    stage: name,
    avgDays: days,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip formatter={(value) => [`${value} 天`, "平均时长"]} />
        <Legend />
        <Bar dataKey="avgDays" fill="#52c41a" name="平均时长(天)" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DeptWorkload;
