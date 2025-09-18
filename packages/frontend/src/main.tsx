import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import 'antd/dist/reset.css';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider } from 'antd';
import { App as AntdApp } from 'antd';
import { useThemeStore, skins } from './store/themeStore';
import './i18n';
import { useTranslation } from 'react-i18next';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

function Root() {
  const skinKey = useThemeStore((s) => s.skin);
  const skin = skins[skinKey];
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh-CN' || i18n.language?.startsWith('zh');
  const antdLocale = isZh ? zhCN : enUS;

  dayjs.locale(isZh ? 'zh-cn' : 'en');

  return (
    <ConfigProvider theme={{ algorithm: skin.algorithm, token: skin.token }} locale={antdLocale}>
      <StyleProvider hashPriority="high">
        <AntdApp>
          <App />
        </AntdApp>
      </StyleProvider>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
