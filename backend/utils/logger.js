const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 创建日志目录
const logDir = path.resolve(process.cwd(), '../data/log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建 winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'myf-db-system' },
  transports: []
});

// 生产环境配置文件日志
if (process.env.NODE_ENV === 'production') {
  // 应用日志 - 只记录warn及以上级别
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    level: 'warn',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true
  }));

  // 错误日志
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    tailable: true
  }));

  console.log(`生产环境日志已配置 - 日志目录: ${logDir}`);
  console.log('🔕 已优化日志配置: 减少静态文件和无关请求的记录');
} else {
  // 开发环境只输出到控制台
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp || new Date().toISOString()} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    )
  }));
}

// 创建访问日志记录器 - 仅记录API请求
const accessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, message }) => {
      return `${timestamp} ${message}`;
    })
  ),
  transports: []
});

if (process.env.NODE_ENV === 'production') {
  accessLogger.add(new winston.transports.File({
    filename: path.join(logDir, 'access.log'),
    maxsize: 3 * 1024 * 1024, // 3MB
    maxFiles: 3,
    tailable: true
  }));
} else {
  // 开发环境不记录访问日志
  accessLogger.add(new winston.transports.Console({
    silent: true // 静默模式，不输出
  }));
}

module.exports = {
  logger,
  accessLogger
};
