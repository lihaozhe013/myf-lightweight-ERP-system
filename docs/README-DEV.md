# 开发文档目录

本目录包含了项目的所有开发相关文档，用于辅助开发者理解项目结构、API、业务逻辑等。

## 📂 文档结构

### 🏗️ 项目架构
- [项目结构与配置](./project-structure.md) - 项目目录结构、技术栈、配置管理
- [数据库设计](./database-design.md) - 数据表结构、字段说明、索引设计
- [API接口文档](./api-reference.md) - RESTful API接口规范、参数说明

### 🔐 认证系统  
- [认证架构](./authentication.md) - JWT无状态认证、角色权限、安全机制
- [前端API使用指南](./Frontend%20-%20API_USAGE_GUIDE.md) - 认证钩子使用、API调用规范

### 💼 业务模块
- [核心业务逻辑](./business-logic.md) - 库存管理、价格管理、财务计算
- [数据分析功能](./analysis-features.md) - 分析架构、缓存机制、导出功能
- [精确计算架构](./decimal-calculation.md) - decimal.js集成、精度管理

### 🎨 前端开发
- [组件设计规范](./frontend-components.md) - 组件化架构、设计原则、复用策略
- [页面结构说明](./frontend-pages.md) - 页面组织、路由管理、状态管理

### 🔧 工具与运维
- [导出功能架构](./export-features.md) - Excel导出、模板管理、性能优化
- [日志管理](./logging.md) - 日志架构、文件管理、监控建议
- [开发工具](./development-tools.md) - 调试工具、测试策略、部署指南

## 🚀 快速开始

### 新开发者入门顺序
1. **项目概览**: 阅读 [项目结构与配置](./project-structure.md)
2. **数据理解**: 查看 [数据库设计](./database-design.md)  
3. **API掌握**: 学习 [API接口文档](./api-reference.md)
4. **认证集成**: 了解 [认证架构](./authentication.md) 和 [前端API使用指南](./Frontend%20-%20API_USAGE_GUIDE.md)
5. **业务开发**: 理解 [核心业务逻辑](./business-logic.md)

### 常用场景快速索引
- **添加新API**: 参考 [API接口文档](./api-reference.md) + [认证架构](./authentication.md)
- **创建新页面**: 查看 [前端组件设计](./frontend-components.md) + [页面结构](./frontend-pages.md)
- **财务计算**: 必读 [精确计算架构](./decimal-calculation.md)
- **数据导出**: 参考 [导出功能架构](./export-features.md)
- **数据分析**: 查看 [数据分析功能](./analysis-features.md)

## 📋 开发规范

### 代码质量
- **组件化**: 遵循单一职责原则，参考 [组件设计规范](./frontend-components.md)
- **API规范**: 统一使用认证钩子，参考 [前端API使用指南](./Frontend%20-%20API_USAGE_GUIDE.md)
- **精确计算**: 所有财务计算必须使用 decimal.js，参考 [精确计算架构](./decimal-calculation.md)

### 性能优化
- **缓存机制**: 理解各模块缓存策略，参考 [数据分析功能](./analysis-features.md)
- **数据库优化**: 了解表结构和索引，参考 [数据库设计](./database-design.md)
- **导出性能**: 使用流式导出，参考 [导出功能架构](./export-features.md)

### 安全要求
- **认证集成**: 所有API必须使用JWT认证，参考 [认证架构](./authentication.md)
- **权限控制**: 了解角色权限体系
- **数据验证**: 前后端双重验证

## 🔄 文档维护

### 更新原则
- **功能变更**: 新增功能时同步更新相关文档
- **API变更**: API修改时必须更新 [API接口文档](./api-reference.md)
- **架构调整**: 架构变更时更新对应的架构文档

### 版本管理
- 所有文档变更通过Git进行版本控制
- 重要变更在文档中标注更新时间
- 保持文档与代码的同步性

---

*本文档目录最后更新: 2025年8月*
