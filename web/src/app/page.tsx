import { Card, Col, Row, Space, Flex, Progress, Typography, Statistic } from "antd";
import MedicineDosageTimeline from '@/components/MedicineDosageTimeline';
import TodaysSessionsCard from '@/components/TodaysSessionsCard';
import InventoryStatusCard from '@/components/InventoryStatusCard';
import MedicineAdherenceCard from '@/components/MedicineAdherenceCard';
import ArrowUpOutlined from '@ant-design/icons/lib/icons/ArrowUpOutlined';
import ArrowDownOutlined from '@ant-design/icons/lib/icons/ArrowDownOutlined';

export default function FrontPage() {
  return (
    <>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <TodaysSessionsCard />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <InventoryStatusCard />
          </Col>
          <Col xs={24} sm={12} md={4} lg={4}>
            <MedicineAdherenceCard />
          </Col>
          <Col xs={24} sm={12} md={4} lg={4}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card>
              <Statistic
                title="Vaccination Coverage"
                value={0}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                suffix="%"
              />
              </Card>
              <Card>
                <Statistic
                  title="Spay/Neuter Status"
                  value={0}
                  precision={2}
                  suffix="%"
                />
              </Card>
            </Space>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Card title="Daily Dosage per Medicine">
              <MedicineDosageTimeline />
            </Card>
          </Col>
        </Row>
      </Space>
    </>
  );
}