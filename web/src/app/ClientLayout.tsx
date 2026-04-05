'use client';

import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '@/utils/version';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { env } from 'next-runtime-env';

import {
  DashboardOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  InboxOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { PiPawPrint } from 'react-icons/pi';

import { Alert, Button, Layout, Menu, theme, ConfigProvider } from 'antd';
const { Header, Content, Footer, Sider } = Layout;

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { MenuProps } from 'antd';
type MenuItem = Required<MenuProps>['items'][number];

const DevBanner = ({
  showDevBanner,
  setShowDevBanner,
}: {
  showDevBanner: boolean;
  setShowDevBanner: (show: boolean) => void;
}) => {
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

export default function ClientLayout({ children }: React.PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [broken, setBroken] = useState(false);
  const [showDevBanner, setShowDevBanner] = useState(true);
  const pathname = usePathname();
  const apiUrl = env('NEXT_PUBLIC_API_URL') ?? '';

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
          label: <Link href="/treatments/sessions/today">Today&apos;s Sessions</Link>,
        },
        {
          key: '/treatments/sessions/yesterday',
          label: <Link href="/treatments/sessions/yesterday">Yesterday&apos;s Sessions</Link>,
        },
        {
          key: '/treatments/sessions/tomorrow',
          label: <Link href="/treatments/sessions/tomorrow">Tomorrow&apos;s Sessions</Link>,
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
          key: '/vaccinations/vaccine-doses',
          label: <Link href="/vaccinations/vaccine-doses">Vaccine Doses</Link>,
        },
        {
          key: '/vaccinations/vaccine-types',
          label: <Link href="/vaccinations/vaccine-types">Vaccine Types</Link>,
        },
        {
          key: '/vaccinations/vaccine-products',
          label: <Link href="/vaccinations/vaccine-products">Vaccine Products</Link>,
        }
      ],
    },
    {
      key: '/clinical-directory',
      icon: <BankOutlined />,
      label: 'Clinical Directory',
      children: [
        {
          key: '/clinical-directory/clinics',
          label: <Link href="/clinical-directory/clinics">Clinics</Link>,
        },
        {
          key: '/clinical-directory/veterinarians',
          label: <Link href="/clinical-directory/veterinarians">Veterinarians</Link>,
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
      key: '/medical',
      icon: <MedicineBoxOutlined />,
      label: 'Medical',
      children: [
        {
          key: '/medical/records',
          label: <Link href="/medical/records">Medical Records</Link>,
        },
        {
          key: '/medical/health-conditions',
          label: <Link href="/medical/health-conditions">Health Conditions</Link>,
        },
        {
          key: '/medical/test-results',
          label: <Link href="/medical/test-results">Test Results</Link>,
        },
        {
          key: '/medical/follow-ups',
          label: <Link href="/medical/follow-ups">Follow-Ups</Link>,
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
          label: <Link href={`${apiUrl}/admin`} target="_blank">Admin Panel</Link>,
        },
      ],
    },
  ];

  const getSelectedKeys = () => (pathname ? [pathname] : []);

  useEffect(() => {
    const newOpenKeys: string[] = [];
    if (pathname?.startsWith('/treatments')) newOpenKeys.push('/treatments');
    if (pathname?.startsWith('/inventory')) newOpenKeys.push('/inventory');
    if (pathname?.startsWith('/vaccinations')) newOpenKeys.push('/vaccinations');
    if (pathname?.startsWith('/clinical-directory')) newOpenKeys.push('/clinical-directory');
    if (pathname?.startsWith('/medical')) newOpenKeys.push('/medical');
    if (
      pathname &&
      (pathname.startsWith('/settings') || pathname === '/users' || pathname === '/admin')
    ) {
      newOpenKeys.push('/settings');
    }
    setOpenKeys(newOpenKeys);
  }, [pathname]);

  const handleOpenChange = (keys: string[]) => setOpenKeys(keys);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const menuItem = menuItems.find((item) => item && item.key === e.key);
    if (menuItem && 'children' in menuItem && menuItem.children) return;
    if (broken) setCollapsed(true);
  };

  const toggleSidebar = () => setCollapsed((c) => !c);

  return (
    <QueryClientProvider client={queryClient}>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            components: {
              Layout: { siderBg: '#ffffff' },
              Menu: {
                itemBg: '#ffffff',
                itemColor: '#333',
                itemHoverColor: '#333',
                itemHoverBg: '#f0f0f0',
                itemSelectedBg: '#e6f7ff',
                itemSelectedColor: '#333',
                itemActiveBg: '#f0f0f0',
              },
            },
          }}
        >
          <Layout style={{ minHeight: '100vh' }}>
            <Sider
              trigger={null}
              collapsible
              collapsed={collapsed}
              width={240}
              breakpoint="lg"
              collapsedWidth={broken ? 0 : 80}
              onBreakpoint={(isBroken) => {
                setBroken(isBroken);
                if (isBroken) setCollapsed(true);
                else setCollapsed(false);
              }}
              onCollapse={(isCollapsed, type) => {
                if (type === 'clickTrigger') setCollapsed(isCollapsed);
              }}
              style={{
                overflow: 'auto',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 1001,
                boxShadow: broken && !collapsed ? '2px 0 8px rgba(0,0,0,0.15)' : 'none',
              }}
            >
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
                <span
                  style={{
                    fontSize: broken && !collapsed ? 24 : collapsed ? 18 : 24,
                    fontFamily: '"Cedarville Cursive", cursive',
                    fontWeight: 'normal',
                    letterSpacing: '1px',
                    color: '#111',
                  }}
                >
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
                inlineCollapsed={collapsed && !broken}
              />
            </Sider>

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
                aria-hidden
              />
            )}

            <Layout
              style={{
                marginLeft: broken ? 0 : collapsed ? 80 : 240,
                transition: 'margin-left 0.2s',
              }}
            >
              <Header
                style={{
                  padding: 0,
                  background: colorBgContainer,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 999,
                }}
              >
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={toggleSidebar}
                  style={{ fontSize: '16px', width: 64, height: 64 }}
                />
              </Header>

              <DevBanner showDevBanner={showDevBanner} setShowDevBanner={setShowDevBanner} />
              <Content style={{ margin: broken ? '8px' : '16px' }}>
                  <main>{children}</main>
              </Content>
              <Footer style={{ textAlign: 'center' }}>
                <div>
                  <span style={{ fontFamily: 'Cedarville Cursive' }}>
                    {new Date().getFullYear()} WSWSWS
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      marginLeft: '8px',
                      fontWeight: 300,
                      opacity: 0.7,
                    }}
                  >
                    v{APP_VERSION}
                  </span>
                </div>
              </Footer>
            </Layout>
          </Layout>
        </ConfigProvider>
      </AntdRegistry>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
