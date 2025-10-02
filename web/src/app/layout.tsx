'use client';

import React, { useState } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  DashboardOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

import { Button, Breadcrumb, Layout, Menu, theme, ConfigProvider } from 'antd';
const { Header, Content, Footer, Sider } = Layout;

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import type { MenuProps } from 'antd';
type MenuItem = Required<MenuProps>['items'][number];

const RootLayout = ({ children }: React.PropsWithChildren) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Menu items with actual links
  const menuItems: MenuItem[] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link href="/">Dashboard</Link>,
    },
    {
      key: '/treatments',
      icon: <MedicineBoxOutlined />,
      label: <Link href="/treatments">Treatments</Link>, // Make parent clickable
      children: [
        {
          key: '/treatments/sessions/today',
          label: <Link href="/treatments/sessions/today">Today's Sessions</Link>,
        },
        {
          key: '/treatments/sessions/yesterday',
          label: <Link href="/treatments/sessions/yesterday">Yesterday's Sessions</Link>,
        },
        {
          key: '/treatments/sessions/tomorrow',
          label: <Link href="/treatments/sessions/tomorrow">Tomorrow's Sessions</Link>,
        },
        {
          key: '/treatments/schedules',
          label: <Link href="/treatments/schedules">All Schedules</Link>,
        },
      ],
    },
    {
      key: '/patients',
      icon: <UserOutlined />,
      label: <Link href="/patients">Patients</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link href="/settings">Settings</Link>, // Make parent clickable
      children: [
        {
          key: '/users',
          label: <Link href="/users">Users</Link>,
        },
        {
          key: '/admin',
          label: <Link href={`${process.env.NEXT_PUBLIC_API_URL}/admin`} target="_blank">Admin Panel</Link>,
        },
      ],
    },
  ];

  // Get selected keys based on current pathname
  const getSelectedKeys = () => {
    return pathname ? [pathname] : [];
  };

  // Initialize open keys based on current pathname
  React.useEffect(() => {
    const newOpenKeys: string[] = [];
    if (pathname.startsWith('/treatments')) {
      newOpenKeys.push('/treatments');
    }
    if (pathname.startsWith('/settings') || pathname === '/users' || pathname === '/admin') {
      newOpenKeys.push('/settings');
    }
    setOpenKeys(newOpenKeys);
  }, [pathname]);

  // Handle submenu open/close
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // Handle menu click
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    console.log('Menu clicked:', e);
    // Parent items are now clickable through their Link components
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <QueryClientProvider client={queryClient}>
          <AntdRegistry>
            <ConfigProvider
              theme={{
                components: {
                  Layout: {
                    siderBg: '#ffffff',
                  },
                  Menu: {
                    itemBg: '#ffffff',
                    itemColor: '#333',
                    itemHoverColor: '#1890ff',
                    itemHoverBg: '#f0f0f0',
                    itemSelectedBg: '#e6f7ff',
                    itemSelectedColor: '#1890ff',
                  }
                }
              }}
            >
              <Layout style={{ minHeight: '100vh' }}>
                <Sider
                  trigger={null}
                  collapsible 
                  collapsed={collapsed}
                  width={240}
                  collapsedWidth={80}
                  style={{
                    overflow: 'auto',
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
                      borderBottom: '1px solid #f0f0f0',
                      background: '#fff',
                    }}
                  >
                    <span style={{ 
                      fontSize: collapsed ? 16 : 20, 
                      fontWeight: 'bold',
                      color: '#1890ff'
                    }}>
                      {collapsed ? 'WS' : 'WSWSWS'}
                    </span>
                  </div>

                  <Menu 
                    theme="light"
                    mode="inline" 
                    selectedKeys={getSelectedKeys()}
                    openKeys={collapsed ? [] : openKeys} // Don't show open submenus when collapsed
                    onOpenChange={handleOpenChange}
                    onClick={handleMenuClick}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                    inlineCollapsed={collapsed}
                  />
                </Sider>

                <Layout style={{ 
                  marginLeft: collapsed ? 80 : 240, 
                  transition: 'margin-left 0.2s' 
                }}>
                  <Header style={{ 
                    padding: 0, 
                    background: colorBgContainer,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {/* Collapse/Expand Button */}
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

                  <Content style={{ margin: '0 16px' }}>
                    <Breadcrumb
                      style={{ margin: '16px 0' }}
                      items={[
                        { title: <Link href="/">🏠</Link> },
                        { title: <Link href="/treatments/sessions">Sessions</Link>},
                        { title: "Today"}
                      ]}
                    />
                    <div
                      style={{
                        padding: 24,
                        minHeight: 360,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                      }}
                    >
                      <main>{children}</main>
                    </div>
                  </Content>
                  <Footer style={{ textAlign: 'center' }}>
                    {new Date().getFullYear()} Medical System
                  </Footer>
                </Layout>
              </Layout>
            </ConfigProvider>
          </AntdRegistry>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;