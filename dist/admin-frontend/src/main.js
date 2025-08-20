import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import 'antd/dist/reset.css';
import { StyleProvider } from '@ant-design/cssinjs';
createRoot(document.getElementById('root')).render(<StrictMode>
    <StyleProvider hashPriority="high">
      <App />
    </StyleProvider>
  </StrictMode>);
//# sourceMappingURL=main.js.map