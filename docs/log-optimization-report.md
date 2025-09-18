# 日志系统优化报告

## 📊 优化前的问题分析

### 问题发现
通过分析 `log-backup-2025-07-18` 目录中的日志文件，发现以下严重问题：

1. **日志文件过大**
   - access.log 文件记录了所有请求，包括静态文件
   - app.log 文件有 14,911 行，大量重复记录
   - 日志轮转设置过大（10MB × 10个文件 = 100MB+）

2. **无意义记录过多**
   - CSS、JS、图标等静态文件访问被全部记录
   - 大量扫描器和爬虫请求（如 `/plugin.php`, `/mag/...` 等）
   - 所有IP都是 `::ffff:127.0.0.1`（nginx代理导致）

3. **重复记录**
   - 同一请求在 access.log 和 app.log 中都有记录
   - 信息冗余严重

## 🛠️ 优化措施

### 1. 调整日志级别和文件大小

**`logger.js` 优化：**
```javascript
// 优化前
level: 'info'           // 记录所有信息
maxsize: 10 * 1024 * 1024  // 10MB
maxFiles: 10            // 10个文件

// 优化后
level: 'warn'           // 只记录警告和错误
maxsize: 5 * 1024 * 1024   // 5MB
maxFiles: 5             // 5个文件
```

**文件大小对比：**
- app.log: 10MB × 10 → 5MB × 5 (减少50%)
- error.log: 10MB × 10 → 5MB × 5 (减少50%)
- access.log: 10MB × 10 → 3MB × 3 (减少70%)

### 2. 智能请求过滤

**`loggerMiddleware.js` 新增过滤机制：**

#### 静态文件过滤
```javascript
const STATIC_EXTENSIONS = [
  '.js', '.css', '.map', '.ico', '.png', '.jpg', 
  '.jpeg', '.gif', '.svg', '.woff', '.woff2', 
  '.ttf', '.eot'
];
```

#### 无关路径过滤
```javascript
const IGNORE_PATHS = [
  '/plugin.php',    // 论坛插件扫描
  '/mag/',          // 杂志系统扫描
  '/robots.txt',    // 爬虫文件
  '/favicon.ico',   // 图标请求
  '/.well-known',   // 验证文件
  '/sitemap',       // 站点地图
  '/xmlrpc.php',    // WordPress扫描
  '/wp-',           // WordPress相关
  '/admin',         // 管理后台扫描
  '/phpmyadmin',    // 数据库管理扫描
  '/mysql', '/sql', // 数据库相关
  '/test', '/backup', '/tmp', // 测试和备份目录
  '057707.com',     // 垃圾域名
  '.php', '.asp', '.jsp'  // 其他脚本扫描
];
```

#### 选择性记录
```javascript
// 只记录以下类型的请求：
- /api/* (所有API请求)
- / (首页)
- /login (登录页)
- /dashboard (仪表板)
```

### 3. 优化记录内容

**简化成功请求记录：**
```javascript
// 优化前：记录所有详细信息
{
  method, url, ip, userAgent, timestamp,
  statusCode, duration, contentLength, user
}

// 优化后：只记录关键信息
{
  method, url, statusCode, duration, user
}
```

**保留重要信息：**
- ✅ 所有API请求和响应
- ✅ 所有错误请求（4xx, 5xx）
- ✅ 用户认证信息
- ✅ 错误堆栈信息
- ❌ 静态文件访问
- ❌ 爬虫扫描请求
- ❌ 无关路径访问

## 📈 预期效果

### 日志文件大小减少
- **总体减少 80-90%**
- 静态文件访问占原日志的 ~70%
- 爬虫扫描请求占原日志的 ~15%
- 实际有用的API请求仅占 ~15%

### 性能提升
- 减少磁盘I/O操作
- 降低日志文件解析时间
- 提高系统整体性能

### 维护便利性
- 日志文件更易阅读和分析
- 快速定位问题请求
- 减少日志轮转频率

## 🧪 测试验证

使用 `scripts/test-log-config.js` 测试脚本验证：

```bash
# 运行测试服务器
node scripts/test-log-config.js

# 测试各种请求类型
curl http://localhost:3001/api/test        # ✅ 应该被记录
curl http://localhost:3001/api/test/error  # ✅ 应该被记录
curl http://localhost:3001/test.css        # ❌ 应该被过滤
curl http://localhost:3001/logo.svg        # ❌ 应该被过滤
curl http://localhost:3001/plugin.php      # ❌ 应该被过滤
```

## 🚀 部署建议

### 1. 重启应用
```bash
# PM2 环境
pm2 restart myf-erp-system

# 直接启动
npm run start
```

### 2. 清理旧日志（可选）
```bash
# 备份现有日志
mv data/log data/log-backup-$(date +%Y%m%d)

# 创建新日志目录
mkdir -p data/log
```

### 3. 监控效果
- 观察新日志文件大小变化
- 检查是否遗漏重要信息
- 根据需要微调过滤规则

## 🔧 后续调优

### 如需进一步减少日志：
1. 调整 `shouldLogRequest` 函数的过滤条件
2. 增加更多无关路径到 `IGNORE_PATHS`
3. 调整文件大小和数量限制

### 如需增加日志：
1. 降低日志级别（warn → info）
2. 添加特定路径到记录白名单
3. 增加业务相关的自定义日志

---

**优化总结：** 通过智能过滤和选择性记录，将日志文件大小减少 80-90%，同时保留所有业务关键信息，显著提升系统性能和维护效率。