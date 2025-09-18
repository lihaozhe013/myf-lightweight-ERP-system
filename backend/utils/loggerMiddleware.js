const { logger, accessLogger } = require('./logger');

const { logger, accessLogger } = require('./logger');

// 静态文件扩展名过滤
const STATIC_EXTENSIONS = ['.js', '.css', '.map', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];

// 无关紧要的路径过滤 (扫描器、爬虫等)
const IGNORE_PATHS = [
  '/plugin.php',
  '/mag/',
  '/robots.txt',
  '/favicon.ico',
  '/.well-known',
  '/sitemap',
  '/xmlrpc.php',
  '/wp-',
  '/admin',
  '/phpmyadmin',
  '/mysql',
  '/sql',
  '/test',
  '/backup',
  '/tmp',
  '057707.com',
  '.php',
  '.asp',
  '.jsp'
];

// 判断是否应该记录该请求
const shouldLogRequest = (url, method) => {
  // 静态文件过滤
  const hasStaticExtension = STATIC_EXTENSIONS.some(ext => url.toLowerCase().includes(ext));
  if (hasStaticExtension) return false;
  
  // 无关路径过滤
  const isIgnoredPath = IGNORE_PATHS.some(path => url.toLowerCase().includes(path.toLowerCase()));
  if (isIgnoredPath) return false;
  
  // 只记录API请求和重要的页面请求
  return url.startsWith('/api/') || url === '/' || url.startsWith('/login') || url.startsWith('/dashboard');
};

// 请求日志中间件
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // 检查是否应该记录
  const shouldLog = shouldLogRequest(req.originalUrl, req.method);

  // 在生产环境记录访问日志（仅API请求）
  if (process.env.NODE_ENV === 'production' && shouldLog) {
    const userPart = req.user ? ` user=${req.user.username} role=${req.user.role}` : '';
    accessLogger.info(`${req.method} ${req.originalUrl}${userPart}`);
  }

  // 监听响应结束事件
  res.on('finish', () => {
    // 只记录需要关注的请求
    if (!shouldLog) return;
    
    const duration = Date.now() - start;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    // 附带用户信息
    if (req.user) {
      responseInfo.user = { username: req.user.username, role: req.user.role };
    }

    // 根据状态码决定日志级别
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', responseInfo);
    } else if (req.originalUrl.startsWith('/api/')) {
      // 只记录API请求的成功信息，减少日志量
      logger.info('API Request', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        user: req.user ? req.user.username : 'anonymous'
      });
    }
  });

  next();
};

// 错误日志中间件
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
    body: req.body,
    params: req.params,
    query: req.query
  };

  if (req.user) {
    errorInfo.user = { username: req.user.username, role: req.user.role };
  }

  logger.error('API Error', errorInfo);
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
