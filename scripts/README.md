# 脚本目录

本目录包含项目的各种自动化脚本，用于简化开发、部署和运维操作。

## 📂 目录结构

```
scripts/
├── production/          # 生产环境部署脚本
│   ├── start-prod.sh   # 完整的生产环境启动脚本
│   ├── start-pm2.sh    # 简化的PM2启动脚本
│   ├── stop-pm2.sh     # PM2停止脚本
│   └── ecosystem.config.json  # PM2进程配置文件
└── README.md           # 本文件
```

## 🚀 生产环境脚本 (`production/`)

### 主要脚本

**`start-prod.sh`** - 一键生产环境部署脚本
```bash
# 完整部署（推荐）
./scripts/production/start-prod.sh
```
功能：
- 自动安装PM2（如果未安装）
- 安装所有项目依赖
- 构建前端项目
- 使用cluster模式启动后端（max instances）
- 配置日志记录和开机自启动

**`start-pm2.sh`** - 简化PM2启动脚本
```bash
# 使用配置文件快速启动
./scripts/production/start-pm2.sh
```

**`stop-pm2.sh`** - 停止PM2服务
```bash
# 停止生产环境服务
./scripts/production/stop-pm2.sh
```

### 配置文件

**`ecosystem.config.json`** - PM2进程配置
- 集群模式配置
- 内存限制和自动重启
- 日志文件路径
- 环境变量设置

## 🔧 使用方法

### 快速开始
```bash
# 1. 给脚本添加执行权限（首次使用）
chmod +x scripts/production/*.sh

# 2. 启动生产环境
./scripts/production/start-prod.sh

# 3. 查看服务状态
pm2 list

# 4. 停止服务（如需要）
./scripts/production/stop-pm2.sh
```

### 更新根目录package.json脚本路径

由于脚本位置变更，需要更新package.json中的脚本路径：

```json
{
  "scripts": {
    "start:pm2": "pm2 start scripts/production/ecosystem.config.json",
    "stop:pm2": "pm2 stop scripts/production/ecosystem.config.json",
    "restart:pm2": "pm2 restart scripts/production/ecosystem.config.json"
  }
}
```

## 📚 相关文档

- [PM2部署指南](../docs/pm2-deployment.md) - 详细的PM2部署和管理文档
- [项目结构](../docs/project-structure.md) - 整体项目结构说明
- [开发工具](../docs/development-tools.md) - 开发相关工具和脚本

## 🔮 未来扩展

计划添加的脚本类型：
- `development/` - 开发环境脚本
- `testing/` - 测试相关脚本
- `database/` - 数据库操作脚本
- `backup/` - 备份相关脚本
- `monitoring/` - 监控和健康检查脚本

---

*最后更新: 2025年9月*
