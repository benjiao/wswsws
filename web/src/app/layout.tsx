"use client";

import './globals.css';

import React, { useState } from 'react';
import { APP_VERSION } from '@/utils/version';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PublicEnvScript, env } from 'next-runtime-env';

import {
  DashboardOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { PiPawPrint } from "react-icons/pi";

import { Alert, Button, Breadcrumb, Layout, Menu, theme, ConfigProvider } from 'antd';
const { Header, Content, Footer, Sider } = Layout;

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import type { MenuProps } from 'antd';
type MenuItem = Required<MenuProps>['items'][number];

// Component that uses runtime config (must be inside QueryClientProvider)
const DevBanner = ({ showDevBanner, setShowDevBanner }: { showDevBanner: boolean; setShowDevBanner: (show: boolean) => void }) => {
  const NEXT_PUBLIC_DEPLOYMENT_ENV = env('NEXT_PUBLIC_DEPLOYMENT_ENV');
  if (!showDevBanner) return null;
  if (NEXT_PUBLIC_DEPLOYMENT_ENV !== 'development') return null;
  return (
    <Alert
      message={`You are currently on the development server (v${APP_VERSION})`}
      type="warning"
      banner
      closable
      onClose={() => setShowDevBanner(false)}
    />
  );
};

const RootLayout = ({ children }: React.PropsWithChildren) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [broken, setBroken] = useState(false);
  const [showDevBanner, setShowDevBanner] = useState(true);
  const NEXT_PUBLIC_DEPLOYMENT_ENV = env('NEXT_PUBLIC_DEPLOYMENT_ENV');
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
      label: 'Treatments',
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
      key: '/vaccinations',
      icon: <SafetyCertificateOutlined />,
      label: 'Vaccinations',
      children: [
        {
          key: '/vaccinations/vaccine-types',
          label: <Link href="/vaccinations/vaccine-types">Vaccine Types</Link>,
        },
        {
          key: '/vaccinations/vaccine-doses',
          label: <Link href="/vaccinations/vaccine-doses">Vaccine Doses</Link>,
        },
      ],
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: 'Inventory',
      children: [
        {
          key: '/inventory/medicines',
          label: <Link href="/inventory/medicines">Medicines</Link>,
        },
      ],
    },
    {
      key: '/paw-count',
      icon: <PiPawPrint />,
      label: <Link href="/paw-count">Paw Count</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
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
    if (pathname && pathname.startsWith('/treatments')) {
      newOpenKeys.push('/treatments');
    }
    if (pathname && pathname.startsWith('/inventory')) {
      newOpenKeys.push('/inventory');
    }
    if (pathname && pathname.startsWith('/vaccinations')) {
      newOpenKeys.push('/vaccinations');
    }
    if (
      pathname &&
      (pathname.startsWith('/settings') || pathname === '/users' || pathname === '/admin')
    ) {
      newOpenKeys.push('/settings');
    }
    setOpenKeys(newOpenKeys);
  }, [pathname]);

  // Handle submenu open/close
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // Handle menu click - close mobile menu after clicking
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // Prevent navigation for parent menu items with children (they should only toggle submenus)
    const menuItem = menuItems.find(item => item && item.key === e.key);
    if (menuItem && 'children' in menuItem && menuItem.children) {
      // Don't navigate, just toggle the submenu
      return;
    }
    // Close mobile menu after navigation
    if (broken) {
      setCollapsed(true);
    }
  };

  // Toggle sidebar - different behavior for mobile vs desktop
  const toggleSidebar = () => {
    if (broken) {
      // On mobile: toggle between hidden (collapsed=true) and visible (collapsed=false)
      setCollapsed(!collapsed);
    } else {
      // On desktop: toggle between expanded and icon-only
      setCollapsed(!collapsed);
    }
  };

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="description" content="Cat Shelter Management Software" />
        
        {/* Favicon - standard sizes */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        
        {/* Android Chrome */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WSWSWS" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cedarville+Cursive&display=swap" 
          rel="stylesheet" 
        />

        <PublicEnvScript />
      </head>
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
                    itemHoverColor: '#333',
                    itemHoverBg: '#f0f0f0',
                    itemSelectedBg: '#e6f7ff',
                    itemSelectedColor: '#333',
                    itemActiveBg: '#f0f0f0',
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
                  breakpoint="lg"
                  collapsedWidth={broken ? 0 : 80} // Hide completely on mobile, show icons on desktop
                  onBreakpoint={(isBroken) => {
                    setBroken(isBroken);
                    if (isBroken) {
                      setCollapsed(true); // Start collapsed on mobile
                    } else {
                      // Reset to normal state on desktop
                      setCollapsed(false);
                    }
                  }}
                  onCollapse={(isCollapsed, type) => {
                    if (type === 'clickTrigger') {
                      setCollapsed(isCollapsed);
                    }
                  }}
                  style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 1001, // Higher than header
                    boxShadow: broken && !collapsed ? '2px 0 8px rgba(0,0,0,0.15)' : 'none', // Shadow on mobile when open
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
                      fontSize: (broken && !collapsed) ? 24 : (collapsed ? 18 : 24), 
                      fontFamily: '"Cedarville Cursive", cursive',
                      fontWeight: 'normal',
                      letterSpacing: '1px',
                      color: '#111',
                    }}>
                      {collapsed && !broken ? 'ws' : 'wswsws...'}
                    </span>
                  </div>

                  <Menu 
                    theme="light"
                    mode="inline" 
                    selectedKeys={getSelectedKeys()}
                    openKeys={collapsed ? [] : openKeys}
                    onOpenChange={handleOpenChange}
                    onClick={handleMenuClick}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                    inlineCollapsed={collapsed && !broken} // Only inline collapse on desktop
                  />
                </Sider>

                {/* Mobile overlay */}
                {broken && !collapsed && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      zIndex: 1000,
                    }}
                    onClick={() => setCollapsed(true)}
                  />
                )}

                <Layout style={{ 
                  marginLeft: broken ? 0 : (collapsed ? 80 : 240),
                  transition: 'margin-left 0.2s' 
                }}>
                  <Header style={{ 
                    padding: 0, 
                    background: colorBgContainer,
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 999,
                  }}>
                    {/* Hamburger menu button */}
                    <Button
                      type="text"
                      icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                      onClick={toggleSidebar}
                      style={{
                        fontSize: '16px',
                        width: 64,
                        height: 64,
                      }}
                    />
                  </Header>

                  <DevBanner showDevBanner={showDevBanner} setShowDevBanner={setShowDevBanner} />
                  <Content style={{ margin: broken ? '8px' : '16px' }}>

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
                     <div>
                       <span style={{ fontFamily: 'Cedarville Cursive' }}>{new Date().getFullYear()} WSWSWS</span>
                       <span style={{ 
                         fontSize: '9px', 
                         marginLeft: '8px',
                         fontWeight: 300,
                         opacity: 0.7
                       }}>v{APP_VERSION}</span>
                     </div>
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