'use client';

import React, { useState } from 'react';
import {
  DashboardOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: <Link href="/">Dashboard</Link>,
  },
  {
    key: 'treatments',
    icon: <MedicineBoxOutlined />,
    label: 'Treatments',
    children: [
      {
        key: '/treatments/session/today',
        label: <Link href="/treatments/session/today">Today's Sessions</Link>,
      },
      {
        key: '/treatments/session/yesterday',
        label: <Link href="/treatments/session/yesterday">Yesterday's Sessions</Link>,
      },
      {
        key: '/treatments/schedules',
        label: <Link href="/treatments/schedules">Schedules</Link>,
      },
    ],
  },
  {
    key: '/patients',
    icon: <UserOutlined />,
    label: <Link href="/patients">Patients</Link>,
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Settings',
    children: [
      {
        key: '/users',
        label: 'Users',
      },
      {
        key: '/admin',
        label: (
          <Link href={`${process.env.NEXT_PUBLIC_API_URL}/admin`} target="_blank">
            Admin Panel
          </Link>
        ),
      },
    ],
  },
];

const LayoutContent = ({ children }: React.PropsWithChildren) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth="0"
        width={240}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #434343',
            background: '#fff',
          }}
        >
          <Text
            strong
            style={{
              fontSize: collapsed ? 16 : 20,
              color: '#000',
              transition: 'font-size 0.2s',
            }}
          >
            {collapsed ? 'WS' : 'WSWSWS'}
          </Text>
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          theme="dark"
          defaultSelectedKeys={['/treatments/session/today']}
          defaultOpenKeys={['treatments']}
          style={{ 
            borderRight: 0,
            height: 'calc(100vh - 64px)', // Full height minus logo
            overflow: 'auto'
          }}
          items={menuItems}
        />
      </Sider>

      {/* Main Layout */}
      <Layout
        style={{
          marginLeft: collapsed ? 0 : 240,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header
          style={{
            background: '#fff',
            padding: 0,
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: '0',
            minHeight: 'calc(100vh - 64px)',
            background: '#f5f5f5',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              minHeight: 'calc(100vh - 112px)',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutContent;