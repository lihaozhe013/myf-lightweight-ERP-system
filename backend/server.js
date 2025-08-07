const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const { ensureAllTablesAndColumns } = require('./utils/dbUpgrade');
const { logger } = require('./utils/logger');
const { requestLogger, errorLogger } = require('./utils/loggerMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// 数据库初始化
// =============================================================================

// 启动时自动检查和升级数据库结构
try {
  ensureAllTablesAndColumns();
  logger.info('数据库初始化完成');
} catch (error) {
  logger.error('数据库初始化失败', { error: error.message, stack: error.stack });
  process.exit(1);
}

// =============================================================================
// 中间件配置
// =============================================================================

// 请求日志中间件 (在其他中间件之前)
app.use(requestLogger);

// JSON 解析中间件
app.use(express.json());

// CORS 跨域配置 - 仅开发环境启用
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }));
  console.log('开发模式：已启用 CORS 跨域支持');
  logger.info('开发模式：已启用 CORS 跨域支持');
} else {
  logger.info('生产模式：CORS 已禁用');
}

// =============================================================================
// API 路由注册
// =============================================================================

// 导入所有路由模块
const overviewRoutes = require('./routes/overview');               // 总览接口
const inboundRoutes = require('./routes/inbound');                 // 入库管理
const outboundRoutes = require('./routes/outbound');               // 出库管理
const stockRoutes = require('./routes/stock');                     // 库存管理
const partnersRoutes = require('./routes/partners');               // 客户/供应商管理
const productsRoutes = require('./routes/products');               // 产品管理
const productPricesRoutes = require('./routes/productPrices');     // 产品价格管理
const receivableRoutes = require('./routes/receivable');           // 应收账款管理
const payableRoutes = require('./routes/payable');                 // 应付账款管理
const exportRoutes = require('./routes/export/index');             // 导出功能
const analysisRoutes = require('./routes/analysis/analysis');               // 数据分析功能
const aboutRoutes = require('./routes/about');                     // 关于页面

// 注册 API 路由
app.use('/api/overview', overviewRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/outbound', outboundRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/product-prices', productPricesRoutes);
app.use('/api/receivable', receivableRoutes);
app.use('/api/payable', payableRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/about', aboutRoutes);

// =============================================================================
// 错误处理中间件
// =============================================================================

// 错误日志中间件 (在所有路由之后)
app.use(errorLogger);

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// =============================================================================
// 静态文件托管 (生产环境)
// =============================================================================

// 注意：导出文件静态托管已移除，现在使用直接下载方式
// 无需再托管 exported-files 目录

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../frontend/dist');
  
  // 托管前端构建文件
  app.use(express.static(frontendDist));
  
  // SPA 路由回退 - 所有未匹配的非 API 路由返回 index.html
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log('后端服务器启动成功！');
  console.log(`后端API服务: http://localhost:${PORT}`);
  
  logger.info('后端服务器启动成功', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
  
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 生产环境运行中');
    console.log(`🌐 前端生产服务器: http://localhost:8080`);
    logger.info('生产环境运行中', { frontend_url: `http://localhost:8080` });
  } else {
    console.log('🔧 开发模式运行中');
    console.log('🌐 前端开发服务器: http://localhost:5173');
    logger.info('开发模式运行中', { frontend_url: 'http://localhost:5173' });
  }
});