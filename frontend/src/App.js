import React, { useState } from "react";
import { Layout, Menu, Badge } from "antd";
import {
  DashboardOutlined,
  DatabaseOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Todos from "./pages/Todos";
import Collaborations from "./pages/Collaborations";
import WarningCenter from "./pages/WarningCenter";

const { Header, Content, Sider } = Layout;

const App = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">生命周期看板</Link>,
    },
    {
      key: "/warnings",
      icon: <WarningOutlined />,
      label: <Link to="/warnings">风险预警中心</Link>,
    },
    {
      key: "/assets",
      icon: <DatabaseOutlined />,
      label: <Link to="/assets">资产目录</Link>,
    },
    {
      key: "/todos",
      icon: <CheckSquareOutlined />,
      label: <Link to="/todos">部门待办</Link>,
    },
    {
      key: "/collaborations",
      icon: <TeamOutlined />,
      label: <Link to="/collaborations">协同台账</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="dark" width={220}>
        <div
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          玄武区数据资产管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            fontSize: 20,
            fontWeight: "bold",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          公共数据资产全过程管理试点平台
        </Header>
        <Content style={{ margin: "24px", background: "#fff", padding: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/warnings" element={<WarningCenter />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/collaborations" element={<Collaborations />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
