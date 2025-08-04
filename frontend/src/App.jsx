import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import Stock from './pages/Stock';
import Partners from './pages/Partners';
import Products from './pages/Products';
import ProductPrices from './pages/ProductPrices';
import Report from './pages/Report/index';
import Overview from './pages/Overview';
import Receivable from './pages/Receivable';
import Payable from './pages/Payable';
import Analysis from './pages/Analysis';
import { Menu, Layout, Alert, Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Content, Footer } = Layout;

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('错误边界捕获到错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            message="页面加载出错"
            description="页面组件渲染时发生错误，请刷新页面重试。如果问题持续，请检查后端服务是否正常运行。"
            type="error"
            showIcon
            action={
              <button onClick={() => window.location.reload()}>
                刷新页面
              </button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// 语言选择器组件
function LanguageSelector() {
  const { i18n, t } = useTranslation();
  
  const languageOptions = [
    { value: 'zh', label: t('common.chinese'), flag: '🇨🇳' },
    { value: 'en', label: t('common.english'), flag: '🇺🇸' },
    { value: 'ko', label: t('common.korean'), flag: '🇰🇷' },
  ];

  const handleLanguageChange = (value) => {
    i18n.changeLanguage(value);
  };

  return (
    <Space>
      <GlobalOutlined style={{ color: '#666' }} />
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        style={{ minWidth: 120 }}
        size="small"
        options={languageOptions.map(option => ({
          value: option.value,
          label: (
            <Space>
              <span>{option.flag}</span>
              <span>{option.label}</span>
            </Space>
          )
        }))}
      />
    </Space>
  );
}

function AppContent() {
  const location = useLocation();
  const { t } = useTranslation();

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/overview' || path === '/') return 'overview';
    if (path === '/inbound') return 'inbound';
    if (path === '/outbound') return 'outbound';
    if (path === '/stock') return 'stock';
    if (path === '/partners') return 'partners';
    if (path === '/products') return 'products';
    if (path === '/product-prices') return 'product-prices';
    if (path === '/receivable') return 'receivable';
    if (path === '/payable') return 'payable';
    if (path === '/analysis') return 'analysis';
    if (path === '/report') return 'report';
    return 'overview';
  };

  // 菜单项配置
  const menuItems = [
    {
      key: 'overview',
      label: <Link to="/overview" style={{ fontWeight: 'bold' }}>{t('nav.overview')}</Link>,
    },
    {
      key: 'inbound',
      label: <Link to="/inbound" style={{ fontWeight: 'bold' }}>{t('nav.inbound')}</Link>,
    },
    {
      key: 'outbound',
      label: <Link to="/outbound" style={{ fontWeight: 'bold' }}>{t('nav.outbound')}</Link>,
    },
    {
      key: 'stock',
      label: <Link to="/stock" style={{ fontWeight: 'bold' }}>{t('nav.stock')}</Link>,
    },
    {
      key: 'partners',
      label: <Link to="/partners" style={{ fontWeight: 'bold' }}>{t('nav.partners')}</Link>,
    },
    {
      key: 'products',
      label: <Link to="/products" style={{ fontWeight: 'bold' }}>{t('nav.products')}</Link>,
    },
    {
      key: 'product-prices',
      label: <Link to="/product-prices" style={{ fontWeight: 'bold' }}>{t('nav.productPrices')}</Link>,
    },
    {
      key: 'receivable',
      label: <Link to="/receivable" style={{ fontWeight: 'bold' }}>{t('nav.receivable')}</Link>,
    },
    {
      key: 'payable',
      label: <Link to="/payable" style={{ fontWeight: 'bold' }}>{t('nav.payable')}</Link>,
    },
    {
      key: 'analysis',
      label: <Link to="/analysis" style={{ fontWeight: 'bold' }}>{t('nav.analysis')}</Link>,
    },
    {
      key: 'report',
      label: <Link to="/report" style={{ fontWeight: 'bold' }}>{t('nav.report')}</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: '0 24px', height: '50px', lineHeight: '50px' }}>
        <Menu 
          theme="dark" 
          mode="horizontal" 
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ lineHeight: '50px' }}
        />
      </Header>
      <Content style={{ padding: '25px', background: '#f0f2f5', marginTop: '0px' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/inbound" element={<Inbound />} />
              <Route path="/outbound" element={<Outbound />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product-prices" element={<ProductPrices />} />
              <Route path="/receivable" element={<Receivable />} />
              <Route path="/payable" element={<Payable />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/report" element={<Report />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Content>
      <Footer style={{ 
        textAlign: 'center', 
        background: '#fff', 
        borderTop: '1px solid #e8e8e8',
        padding: '12px 24px'
      }}>
        <Space>
          <span style={{ color: '#666' }}>{t('common.language')}:</span>
          <LanguageSelector />
        </Space>
      </Footer>
    </Layout>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
