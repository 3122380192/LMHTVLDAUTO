import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tooltip, message } from 'antd';
import {
  LockOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { ipcRenderer } = window.require('electron');

const AuthScreen = ({ authState }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHWID = () => {
    if (authState.hwid) {
      navigator.clipboard.writeText(authState.hwid);
      setCopied(true);
      message.success('Đã sao chép HWID vào bộ nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExit = () => {
    ipcRenderer.send('exit-app');
  };

  // Modern background style matching Vua Lì Đòn style
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at center, #1b2735 0%, #090a0f 100%)',
    color: '#e6edf3',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '20px'
  };

  const cardStyle = {
    width: '450px',
    background: 'rgba(25, 33, 49, 0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(88, 166, 255, 0.25)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.57)',
    textAlign: 'center',
    padding: '24px'
  };

  // 1. Loading/Checking state
  if (authState.checking) {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#58a6ff', marginBottom: 20 }} />
          <Title level={3} style={{ color: '#e6edf3', margin: 0 }}>Đang xác thực thiết bị...</Title>
          <Text style={{ color: '#8b949e', marginTop: 10, display: 'block' }}>Vui lòng đợi giây lát</Text>
        </Card>
      </div>
    );
  }

  // 2. Expired state
  if (authState.status === 'expired') {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
          <ClockCircleOutlined style={{ fontSize: 54, color: '#ff7b72', marginBottom: 20 }} />
          <Title level={3} style={{ color: '#ff7b72', marginTop: 0 }}>Tool Đã Hết Hạn</Title>
          <Paragraph style={{ color: '#e6edf3', fontSize: 15 }}>
            Bản quyền sử dụng của phần mềm đã hết hạn! (Hạn dùng đến hết ngày 31/07/2026).
          </Paragraph>
          <Paragraph style={{ color: '#8b949e', fontSize: 13 }}>
            Vui lòng liên hệ <strong style={{ color: '#58a6ff' }}>Vua Lì Đòn</strong> để gia hạn thêm thời gian sử dụng.
          </Paragraph>
          <Button type="primary" danger size="large" onClick={handleExit} style={{ marginTop: 10, borderRadius: '8px', width: '150px' }}>
            Thoát ứng dụng
          </Button>
        </Card>
      </div>
    );
  }

  // 3. Blocked state
  if (authState.status === 'blocked') {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
          <CloseCircleOutlined style={{ fontSize: 54, color: '#f85149', marginBottom: 20 }} />
          <Title level={3} style={{ color: '#f85149', marginTop: 0 }}>Thiết Bị Bị Chặn</Title>
          <Paragraph style={{ color: '#e6edf3', fontSize: 15 }}>
            Thiết bị của bạn đã bị <strong style={{ color: '#ff7b72' }}>CHẶN</strong> quyền truy cập sử dụng tool này!
          </Paragraph>
          <Paragraph style={{ color: '#8b949e', fontSize: 13 }}>
            Liên hệ nhà phát triển <strong style={{ color: '#58a6ff' }}>Vua Lì Đòn</strong> để biết thêm thông tin chi tiết.
          </Paragraph>
          <Button type="primary" danger size="large" onClick={handleExit} style={{ marginTop: 10, borderRadius: '8px', width: '150px' }}>
            Thoát ứng dụng
          </Button>
        </Card>
      </div>
    );
  }

  // 4. Pending state (waiting approval)
  if (authState.status === 'pending' || authState.status === 'error') {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
          <LockOutlined style={{ fontSize: 54, color: '#f0883e', marginBottom: 20 }} />
          <Title level={3} style={{ color: '#f0883e', marginTop: 0 }}>Chưa Được Cấp Quyền</Title>
          
          <Paragraph style={{ color: '#e6edf3', fontSize: 15, fontWeight: 500, marginBottom: 5 }}>
            Yêu cầu cấp quyền thiết bị đã được gửi lên hệ thống.
          </Paragraph>
          <Paragraph style={{ color: '#8b949e', fontSize: 13, marginBottom: 20 }}>
            Vui lòng liên hệ <strong style={{ color: '#58a6ff' }}>Vua Lì Đòn</strong> để được phê duyệt bản quyền.
          </Paragraph>

          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(88, 166, 255, 0.15)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase' }}>Mã phần cứng (HWID)</div>
              <div style={{ fontSize: 16, color: '#58a6ff', fontFamily: 'monospace', fontWeight: 'bold', marginTop: 2 }}>{authState.hwid}</div>
            </div>
            <Tooltip title={copied ? "Đã sao chép!" : "Sao chép mã"}>
              <Button 
                type="text" 
                icon={<CopyOutlined style={{ color: '#58a6ff', fontSize: 18 }} />} 
                onClick={handleCopyHWID}
              />
            </Tooltip>
          </div>

          <Space size="middle">
            <Button size="large" onClick={handleExit} style={{ borderRadius: '8px', width: '130px', background: 'transparent', border: '1px solid #ff7b72', color: '#ff7b72' }}>
              Hủy bỏ
            </Button>
            <Button type="primary" size="large" icon={<LoadingOutlined />} disabled style={{ borderRadius: '8px', width: '180px', background: 'rgba(88, 166, 255, 0.15)', border: '1px solid rgba(88, 166, 255, 0.2)', color: '#8b949e' }}>
              Đang đợi duyệt...
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return null;
};

export default AuthScreen;
