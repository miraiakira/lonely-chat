import { useState } from 'react';
import { Button, Form, Input, Card, Typography, App as AntdApp, Segmented, Space, Checkbox } from 'antd';
import { theme as antdTheme } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { useThemeStore, type SkinKey } from '../../store/themeStore';
import logo from '../../assets/longly-chat-logo-horizontal.svg';
import logoLight from '../../assets/longly-chat-logo-horizontal-light.svg';

const { Title, Text } = Typography;

function getBgBySkin(skin: SkinKey) {
  switch (skin) {
    case 'aurora':
      return {
        background: `radial-gradient(1200px 600px at -10% -10%, rgba(29,143,225,0.25) 0%, rgba(29,143,225,0) 60%),
                     radial-gradient(900px 500px at 110% 10%, rgba(110,231,249,0.25) 0%, rgba(110,231,249,0) 60%),
                     linear-gradient(135deg, #1D8FE1 0%, #6EE7F9 100%)`,
      };
    case 'sunset':
      return {
        background: `radial-gradient(1200px 600px at -10% -10%, rgba(255,107,107,0.25) 0%, rgba(255,107,107,0) 60%),
                     radial-gradient(900px 500px at 110% 20%, rgba(253,230,138,0.28) 0%, rgba(253,230,138,0) 60%),
                     linear-gradient(135deg, #FF6B6B 0%, #FDE68A 100%)`,
      };
    case 'midnight':
      return {
        background: `radial-gradient(800px 400px at 0% 0%, rgba(14,165,233,0.25) 0%, rgba(14,165,233,0) 60%),
                     radial-gradient(700px 420px at 100% 100%, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0) 60%),
                     linear-gradient(135deg, #0B1220 0%, #0F172A 100%)`,
      };
    default:
      return { background: '#111' };
  }
}

const Login = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [loading, setLoading] = useState(false);
  const { message } = AntdApp.useApp();
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();

  const skin = useThemeStore((s) => s.skin);
  const setSkin = useThemeStore((s) => s.setSkin);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', values);
      const { access_token } = response.data;
      // 记录“记住我”标记，供前端 token 持久化策略使用
      try {
        localStorage.setItem('rememberMe', values?.remember ? 'true' : 'false');
      } catch {}
      setToken(access_token);
      message.success(t('login.success'));
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      message.error(t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = getBgBySkin(skin);
  const isDark = skin === 'midnight';
  const glassBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.12)' : token.colorBorder;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', ...bgStyle, position: 'relative' }}>
      {/* 背景装饰性光斑 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(600px 300px at 50% -10%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)' }} />

      <Card
        variant="outlined"
        style={{
          width: 'min(980px, 94vw)',
          background: glassBg,
          border: `1px solid ${glassBorder}`,
          boxShadow: isDark
            ? '0 10px 30px rgba(0,0,0,0.45)'
            : '0 10px 30px rgba(16,24,40,0.12)'
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {/* 左侧品牌与主题选择 */}
          <div style={{ flex: '1 1 420px', padding: '36px 36px', borderRight: `1px solid ${glassBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <img src={isDark ? logoLight : logo} alt="longly chat" style={{ height: 36 }} />
            </div>
            <Title level={2} style={{ marginBottom: 8, color: isDark ? '#E2E8F0' : token.colorText }}>
              {t('login.welcomeTitle')}
            </Title>
            <Text style={{ display: 'block', marginBottom: 24, color: isDark ? '#A3B2C2' : token.colorTextSecondary }}>
              {t('login.welcomeSubtitle')}
            </Text>

            <div style={{ marginTop: 12 }}>
              <Text style={{ color: isDark ? '#93A5B1' : token.colorTextSecondary, fontSize: 12 }}>{t('layout.theme')}</Text>
              <div style={{ marginTop: 8 }}>
                <Segmented
                  value={skin}
                  onChange={(val) => setSkin(val as SkinKey)}
                  options={[
                    { label: t('layout.skinAurora'), value: 'aurora' },
                    { label: t('layout.skinSunset'), value: 'sunset' },
                    { label: t('layout.skinMidnight'), value: 'midnight' },
                  ]}
                  block
                />
              </div>

              <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  border: `1px dashed ${glassBorder}`,
                  borderRadius: token.borderRadius,
                  padding: 12,
                  color: isDark ? '#A3B2C2' : token.colorTextSecondary,
                  fontSize: 12,
                }}>
                  • End-to-end Theme with Ant Design
                </div>
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  border: `1px dashed ${glassBorder}`,
                  borderRadius: token.borderRadius,
                  padding: 12,
                  color: isDark ? '#A3B2C2' : token.colorTextSecondary,
                  fontSize: 12,
                }}>
                  • Responsive, Glassmorphism UI
                </div>
              </div>
            </div>
          </div>

          {/* 右侧表单 */}
          <div style={{ flex: '1 1 420px', padding: '36px 36px' }}>
            <div style={{ maxWidth: 420, margin: '0 auto' }}>
              <Title level={3} style={{ textAlign: 'left', marginBottom: 16 }}>{t('login.title')}</Title>
              <Form name="login" layout="vertical" onFinish={onFinish}>
                <Form.Item name="username" label={t('login.username')} rules={[{ required: true, message: t('login.usernameRequired') }]}> 
                  <Input size="large" placeholder={t('login.usernamePlaceholder')} />
                </Form.Item>
                <Form.Item name="password" label={t('login.password')} rules={[{ required: true, message: t('login.passwordRequired') }]}> 
                  <Input.Password size="large" placeholder={t('login.passwordPlaceholder')} />
                </Form.Item>
                <Form.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox>{t('login.rememberMe')}</Checkbox>
                    </Form.Item>
                    <Button type="link" size="small" onClick={() => message.info('Not implemented yet')}>{t('login.forgotPassword')}</Button>
                  </Space>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    {t('login.submit')}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;