import { useState } from 'react';
import { Button, Form, Input, message, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const { Title } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', values);
      const { access_token } = response.data;
      setToken(access_token);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      message.error('登录失败，请检查您的凭据。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(to right, #74ebd5, #ACB6E5)',
    }}>
      <Card style={{ width: 400, borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2}>欢迎登录</Title>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入您的用户名！' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入您的密码！' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;