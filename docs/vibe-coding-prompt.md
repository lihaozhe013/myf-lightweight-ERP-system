# 项目开发说明（vibe coding专用）

本文件用于辅助LLM理解本项目结构、API、数据库设计和核心业务逻辑，便于自动化代码生成和智能对话开发。

---

## 一、项目结构

- **backend/**
  - `server.js`：Express服务器入口
  - `db.js`：SQLite数据库连接和操作
  - `routes/`：API路由模块（如inbound、outbound、stock、partners、products、productPrices、ceivable、payable、analysis等）
    - `export.js`：Node.js原生Excel导出API（基础信息、入库出库、应收应付）
    - `receivable.js`：应收账款管理API（实时聚合、回款记录CRUD）
    - `payable.js`：应付账款管理API（实时聚合、付款记录CRUD）
    - `analysis.js`：数据分析API（按时间、客户、产品维度分析销售数据，支持缓存机制）
  - `utils/`：数据库结构、测试数据、库存等工具
    - `excelExporter.js`：Excel导出核心类（Node.js + xlsx实现）
    - `exportTemplates.js`：Excel导出模板定义
    - `exportQueries.js`：导出数据查询模块
    - `decimalCalculator.js`：**decimal.js 精确计算工具类**（解决浮点数精度问题，用于所有金额、价格、余额计算）
    - `logger.js`：Winston日志配置文件
    - `loggerMiddleware.js`：日志中间件（请求日志、错误日志）
- **frontend/**
  - `index.html`、`vite.config.js`、`src/`（App.jsx、main.jsx、pages/等）
  - `src/pages/`：页面组件
    - `Receivable/`：应收账款管理页面目录
      - `index.jsx`：主页面，表格和逻辑
      - `components/ReceivableTable.jsx`：表格展示
      - `components/ReceivableModal.jsx`：新增/编辑回款弹窗
    - `Payable/`：应付账款管理页面目录
      - `index.jsx`：主页面，表格和逻辑
      - `components/PayableTable.jsx`：表格展示
      - `components/PayableModal.jsx`：新增/编辑付款弹窗
    - `Inbound/`：入库管理页面目录
      - `index.jsx`：主入库组件
      - `components/InboundFilter.jsx`：筛选器组件
      - `components/InboundTable.jsx`：表格组件
      - `components/InboundModal.jsx`：弹窗表单组件
    - `Outbound/`：出库管理页面目录
      - `index.jsx`：主出库组件
      - `components/OutboundFilter.jsx`：筛选器组件
      - `components/OutboundTable.jsx`：表格组件
      - `components/OutboundModal.jsx`：弹窗表单组件
    - `Overview.jsx`：总览调试页
    - `Stock.jsx`：库存明细页
    - `Partners.jsx`：客户/供应商管理页
    - `Products.jsx`：产品管理页
    - `ProductPrices.jsx`：产品价格管理页
    - `Analysis/index.jsx`：数据分析页面（按时间、客户、产品维度分析销售数据）
- 根目录：`package.json`、`README.md`、`ask-llm.md`（本文件）
- **data/**：数据存储目录
  - `log/`：日志文件目录（生产环境）
    - `app.log`：应用主日志
    - `error.log`：错误日志
    - `access.log`：HTTP访问日志
  - `data.db` SQLite 数据库文件
  - `analysis-cache.json`：数据分析缓存文件（自动清理30天以上过期数据）

---

## 二、数据库设计

### 1. 入库记录表 inbound_records
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 入库单号 |
| supplier_code | TEXT | 供应商代号 |
| supplier_short_name | TEXT | 供应商简称 |
| supplier_full_name | TEXT | 供应商全称 |
| product_code | TEXT | 产品代号 |
| product_model | TEXT | 产品型号 |
| quantity | INTEGER | 数量 |
| unit_price | REAL | 单价 |
| total_price | REAL | 总价（自动计算） |
| inbound_date | TEXT | 入库时间 |
| invoice_date | TEXT | 开票日期 |
| invoice_number | TEXT | 发票号码 |
| invoice_image_url | TEXT | 发票图片链接 |
| order_number | TEXT | 订单号 |
| remark | TEXT | 备注 |

### 2. 出库记录表 outbound_records
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 出库单号 |
| customer_code | TEXT | 客户代号 |
| customer_short_name | TEXT | 客户简称 |
| customer_full_name | TEXT | 客户全称 |
| product_code | TEXT | 产品代号 |
| product_model | TEXT | 产品型号 |
| quantity | INTEGER | 数量 |
| unit_price | REAL | 单价 |
| total_price | REAL | 总价（自动计算） |
| outbound_date | TEXT | 出库时间 |
| invoice_date | TEXT | 开票日期 |
| invoice_number | TEXT | 发票号码 |
| invoice_image_url | TEXT | 发票图片链接 |
| order_number | TEXT | 订单号 |
| remark | TEXT | 备注 |

### 3. 库存缓存文件 stock-summary.json
**说明**：本项目不再使用库存表，改用JSON文件存储每个产品的当前库存总量，通过入库/出库记录异步计算生成

**文件位置**：`/data/stock-summary.json`

**数据结构**：
```json
{
  "last_updated": "2025-07-24T10:30:00.000Z",
  "total_cost_estimate": 125000.50,
  "products": {
    "产品型号A": {
      "current_stock": 100,
      "last_inbound": "2025-07-20",
      "last_outbound": "2025-07-22"
    },
    "产品型号B": {
      "current_stock": -5,
      "last_inbound": "2025-07-15",
      "last_outbound": "2025-07-23"
    }
  }
}
```

### 4. 客户/供应商表 partners
| 字段 | 类型 | 说明 |
|---|---|---|
| code | TEXT UNIQUE | 代号（唯一） |
| short_name | TEXT PRIMARY KEY | 简称（唯一） |
| full_name | TEXT | 全称 |
| address | TEXT | 地址 |
| contact_person | TEXT | 联系人 |
| contact_phone | TEXT | 联系电话 |
| type | INTEGER | 0=供应商，1=客户 |

### 5. 产品表 products
| 字段 | 类型 | 说明 |
|---|---|---|
| code | TEXT UNIQUE | 代号（唯一） |
| category | TEXT | 产品类别 |
| product_model | TEXT | 产品型号 |
| remark | TEXT | 备注 |

### 6. 产品价格表 product_prices
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| partner_short_name | TEXT | 供应商/客户简称 |
| product_model | TEXT | 产品型号 |
| effective_date | TEXT | 生效日期 |
| unit_price | REAL | 单价 |

### 8. 回款记录表 receivable_payments
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| customer_code | TEXT | 客户代号 |
| amount | REAL | 回款金额 |
| pay_date | TEXT | 回款日期 |
| pay_method | TEXT | 回款方式 |
| remark | TEXT | 备注 |

### 9. 付款记录表 payable_payments
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| supplier_code | TEXT | 供应商代号 |
| amount | REAL | 付款金额 |
| pay_date | TEXT | 付款日期 |
| pay_method | TEXT | 付款方式 |
| remark | TEXT | 备注 |

---

## 三、API接口（RESTful）

- 统一前缀：`/api/`
- 主要接口：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/inbound | 获取入库记录列表（分页/筛选） |
| POST | /api/inbound | 新增入库记录 |
| PUT | /api/inbound/:id | 修改入库记录 |
| DELETE | /api/inbound/:id | 删除入库记录 |
| GET | /api/outbound | 获取出库记录列表（分页/筛选） |
| POST | /api/outbound | 新增出库记录 |
| PUT | /api/outbound/:id | 修改出库记录 |
| DELETE | /api/outbound/:id | 删除出库记录 |
| GET | /api/stock | 获取库存明细（读取缓存文件，支持产品筛选分页） |
| POST | /api/stock/refresh | 重新计算并刷新库存缓存（基于入库/出库记录重新计算所有产品库存） |
| GET | /api/stock/total-cost-estimate | 获取库存总成本估算（基于当前库存数量×最新进货单价计算，读取缓存数据） |
| GET | /api/partners | 获取客户/供应商列表 |
| POST | /api/partners | 新增客户/供应商 |
| PUT | /api/partners/:short_name | 修改客户/供应商 |
| DELETE | /api/partners/:short_name | 删除客户/供应商 |
| GET | /api/products | 获取产品列表 |
| POST | /api/products | 新增产品 |
| PUT | /api/products/:short_name | 修改产品 |
| DELETE | /api/products/:short_name | 删除产品 |
| GET | /api/product-prices | 获取产品价格列表 |
| GET | /api/product-prices/current | 获取当前有效价格 |
| POST | /api/product-prices | 新增产品价格 |
| PUT | /api/product-prices/:id | 修改产品价格 |
| DELETE | /api/product-prices/:id | 删除产品价格 |
| GET | /api/product-prices/auto | 自动获取产品单价（参数：partner_short_name, product_model, date，返回匹配的单价） |
| POST | /api/export/base-info | Node.js Excel导出基础信息（客户/供应商、产品、产品价格），直接返回Excel文件流 |
| POST | /api/export/inbound-outbound | Node.js Excel导出入库出库记录（支持日期、产品代号、客户代号筛选），直接返回Excel文件流 |
| POST | /api/export/receivable-payable | Node.js Excel导出应收应付明细，直接返回Excel文件流 |
| POST | /api/export/statement | Node.js Excel导出对账单（定制格式的入库出库记录），直接返回Excel文件流 |
| POST | /api/export/invoice | Node.js Excel导出发票明细（按产品合并数量和金额），直接返回Excel文件流 |
| POST | /api/export/analysis | Node.js Excel导出数据分析（分析汇总和详细数据），直接返回Excel文件流 |
| POST | /api/export/analysis/advanced | Node.js Excel高级导出数据分析（按客户或产品分类的批量导出，多工作表），直接返回Excel文件流 |
| GET | /api/export/status | 获取导出服务状态和可用导出类型 |
| GET | /api/product-categories | **已废弃** - 使用data目录下的配置文件 frontend/src/config/appConfig.json |
| POST | /api/product-categories | **已废弃** - 使用data目录下的配置文件 frontend/src/config/appConfig.json |
| DELETE | /api/product-categories/:name | **已废弃** - 使用data目录下的配置文件 frontend/src/config/appConfig.json |
| POST | /api/stock-rebuild/rebuild | **已废弃** - 改用 POST /api/stock/refresh |
| GET | /api/receivable | 获取应收账款列表（分页/筛选/排序） |
| POST | /api/receivable/payments | 新增回款记录 |
| PUT | /api/receivable/payments/:id | 修改回款记录 |
| DELETE | /api/receivable/payments/:id | 删除回款记录 |
| GET | /api/receivable/details/:customer_code | 获取客户应收账款详情 |
| GET | /api/payable | 获取应付账款列表（分页/筛选/排序） |
| POST | /api/payable/payments | 新增付款记录 |
| PUT | /api/payable/payments/:id | 修改付款记录 |
| DELETE | /api/payable/payments/:id | 删除付款记录 |
| GET | /api/payable/details/:supplier_code | 获取供应商应付账款详情 |
| GET | /api/overview/stats | 获取系统统计数据（**纯读取overview-stats.json缓存文件**，包含总体数据、缺货产品明细字段 out_of_stock_products，无任何计算逻辑） |
| POST | /api/overview/stats | 强制刷新统计数据，**执行所有概览相关计算并写入缓存**，包括销售额分布、库存状态、所有产品本月变化量等，返回最新统计数据 |
| GET | /api/overview/monthly-stock-change/:productModel | 获取指定产品的本月库存变化量（简化版本，参数：产品型号productModel，返回月初库存、当前库存、本月变化量，移除额外的统计信息以减少计算量） |
| GET | /api/overview/top-sales-products | 获取销售额前10的商品及"其他"合计（返回格式：[{ product_model, total_sales }...]，最后一项为"其他"合计，**只读overview-stats.json缓存，避免每次请求实时计算**） |
| GET | /api/analysis/data | 获取分析数据（从缓存读取，参数：start_date, end_date, customer_code?, product_model?） |
| GET | /api/analysis/detail | 获取详细分析数据（从缓存读取，参数：start_date, end_date, customer_code?, product_model?，返回按客户或产品分组的详细销售数据） |
| POST | /api/analysis/refresh | 刷新分析数据（重新计算并写入缓存，请求体：start_date, end_date, customer_code?, product_model?） |
| GET | /api/analysis/filter-options | 获取分析筛选选项（返回所有客户和产品选项） |
| POST | /api/analysis/clean-cache | 手动清理过期缓存（清理30天以上的缓存数据） |

#### GET /api/overview/stats 返回字段 out_of_stock_products

| 字段 | 类型 | 说明 |
|---|---|---|
| out_of_stock_products | Array | 缺货产品明细，数组元素为 `{ product_model: string }` |

示例：
```json
{
  ...,
  "out_of_stock_products": [
    { "product_model": "iPhone 15 Pro" },
    { "product_model": "MacBook Pro M3" }
  ]
}
```
| GET | /api/overview/monthly-stock-change/:productModel | 获取指定产品的本月库存变化量（简化版本，参数：产品型号productModel，返回月初库存、当前库存、本月变化量，移除额外的统计信息以减少计算量） |
| GET | /api/overview/top-sales-products | 获取销售额前10的商品及“其他”合计（返回格式：[{ product_model, total_sales }...]，最后一项为“其他”合计，**只读overview-stats.json缓存，避免每次请求实时计算**） |

---


## 四、核心业务逻辑

## 四、核心业务逻辑

### 概览页数据缓存机制（重点说明）

**严格的缓存分离架构**：
- **POST 刷新机制**：所有概览统计数据的计算**仅在 POST /api/overview/stats 时执行**，包括：
  - 系统总览统计（销售额、采购额、客户供应商数量等）
  - 缺货产品列表
  - 销售额前10商品分布及"其他"合计
  - **所有产品的本月库存变化量**（预计算所有产品，避免单独查询）
- **JSON 缓存存储**：计算结果统一写入 `/data/overview-stats.json` 缓存文件，包含以下结构：
  ```json
  {
    "overview": { /* 总览统计 */ },
    "out_of_stock_products": [ /* 缺货产品 */ ],
    "top_sales_products": [ /* 销售额前10及其他 */ ],
    "monthly_stock_changes": { 
      "产品型号A": { /* 本月库存变化详情 */ },
      "产品型号B": { /* 本月库存变化详情 */ }
    }
  }
  ```
- **GET 纯读取**：所有 GET 接口（`/api/overview/stats`、`/api/overview/top-sales-products`、`/api/overview/monthly-stock-change/:productModel`）**严格只读取 JSON 缓存文件**，无任何数据库查询和计算逻辑
- **性能优势**：前端页面响应毫秒级，避免复杂聚合查询阻塞系统

**数据更新流程**：
1. 数据变更后（入库、出库、基础数据修改），调用 POST /api/overview/stats 刷新
2. 后端执行所有统计计算，写入 overview-stats.json
3. 前端 GET 请求直接返回缓存数据，无计算延迟

- **价格管理**：产品价格按生效日期管理，查询时取最近有效价格。
- **库存管理**：入库增加库存，出库减少库存，允许库存为负（前端警告）。**库存数据存储在JSON缓存文件中，通过刷新按钮异步重新计算**。**新增总成本估算功能**：基于当前库存数量×各产品最新进货单价计算总成本，帮助了解库存资金占用情况。
- **数据唯一性**：客户/供应商、产品的"代号-简称-全称"三项强绑定，任意一项变更自动同步，后端API校验唯一性。
- **自动计算**：总价自动计算，进出库自动更新库存。
- **智能输入**：入库/出库界面支持代号或简称/型号输入，自动补全匹配项，强绑定校验，使用AutoComplete组件提供流畅的输入体验。
- **精确计算**：**全面使用 decimal.js 进行浮点数精确计算**，解决 JavaScript 原生浮点数精度问题，确保所有金额、价格、余额计算的准确性。

---

## 五、前端页面结构

### 页面组织结构
- **总览调试页**：数据库总览、测试数据
- **入库管理页**：代号-简称强绑定AutoComplete输入，支持筛选和数据导出
- **出库管理页**：代号-简称强绑定AutoComplete输入，支持筛选和数据导出
- **库存明细页**：库存查询与统计，**移除库存历史记录功能**，**添加库存刷新功能**，**新增总成本估算显示**（基于库存数量×最新进货单价）
- **客户/供应商管理页**：代号-简称-全称三项联动
- **产品管理页**：代号-简称-型号三项联动
- **产品价格管理页**：价格历史管理
- **应收账款管理页**：实时聚合应收账款、回款记录管理
- **应付账款管理页**：实时聚合应付账款、付款记录管理
- **数据分析页**：按时间区间、客户、产品维度进行销售数据分析，计算销售额、成本、利润和利润率，支持缓存机制。**新增详细分析功能**：当选择指定客户时显示该客户各产品销售明细，当选择指定产品时显示该产品各客户销售明细

### 组件化架构
**应收账款管理 (`pages/Receivable/`)**
- `index.jsx` - 主页面，负责状态管理和业务逻辑
- `components/ReceivableTable.jsx` - 表格组件（展示、详情、操作）
- `components/ReceivableModal.jsx` - 弹窗表单组件（新增/编辑回款记录）

**应付账款管理 (`pages/Payable/`)**
- `index.jsx` - 主页面，负责状态管理和业务逻辑
- `components/PayableTable.jsx` - 表格组件（展示、详情、操作）
- `components/PayableModal.jsx` - 弹窗表单组件（新增/编辑付款记录）

**入库管理 (`pages/Inbound/`)**
- `index.jsx` - 主入库组件，负责状态管理和业务逻辑
- `components/InboundFilter.jsx` - 筛选器组件（供应商、产品、日期范围）
- `components/InboundTable.jsx` - 表格组件（展示、编辑、删除操作）
- `components/InboundModal.jsx` - 弹窗表单组件（新增/编辑入库记录）

**出库管理 (`pages/Outbound/`)**
- `index.jsx` - 主出库组件，负责状态管理和业务逻辑
- `components/OutboundFilter.jsx` - 筛选器组件（客户、产品、日期范围）
- `components/OutboundTable.jsx` - 表格组件（展示、编辑、删除操作）
- `components/OutboundModal.jsx` - 弹窗表单组件（新增/编辑出库记录）

**数据分析 (`pages/Analysis/`)**
- `index.jsx` - 主分析页面，负责状态管理和业务逻辑，支持时间区间、客户、产品筛选，展示销售额、成本、利润和利润率。**新增详细分析表格功能**：支持按客户或产品维度显示详细销售明细。**新增数据导出功能**：支持将当前分析数据（汇总数据和详细明细）导出为Excel文件，包含数据分析汇总工作表和详细分析工作表。**新增高级导出功能**：当客户和产品都选择ALL时，支持按客户或产品分类的批量导出
- `components/AdvancedExportModal.jsx` - 高级导出选项Modal组件，提供按客户分类导出和按产品分类导出选项

### 组件设计原则
- **单一职责**：每个组件只负责一个特定功能
- **Props传递**：父组件管理状态，子组件通过props接收数据和回调
- **业务逻辑集中**：主要业务逻辑集中在index.jsx中，组件只负责UI展示
- **可复用性**：组件设计考虑复用性，便于维护和扩展

---

## 六、开发建议

### 导出功能架构
- **Node.js原生导出**：使用xlsx库实现Excel导出，内存操作，无临时文件，响应速度快（<50ms）
- **直接下载模式**：前端fetch请求 → 后端生成Excel Buffer → 前端blob下载，一步到位
- **多表导出支持**：
  - 基础信息导出：客户/供应商、产品、产品价格（支持选择性导出）
  - 入库出库记录：支持日期、产品、客户筛选，分别或同时导出
  - 应收应付明细：包含汇总、明细、回款/付款记录多个工作表
  - 对账单导出：定制格式的入库出库记录，适用于客户对账
  - 发票明细导出：按产品合并数量和金额，支持按合作伙伴和日期筛选
  - **数据分析导出**：导出当前分析页面的汇总数据和详细明细表格，支持按客户或产品维度的智能表格布局
  - **高级分析导出**：当客户和产品都选择ALL时，支持按客户或产品分类的批量导出，每个客户/产品生成独立工作表，包含销售汇总和详细明细
- **技术优势**：
  - ✅ 纯Node.js实现，无Python依赖
  - ✅ 内存导出，零磁盘占用  
  - ✅ 即时响应，无需等待文件生成
  - ✅ 支持并发导出请求
  - ✅ Excel格式完全兼容

### 代码组织
- **API优先**：前后端分离，所有业务逻辑在后端实现
- **组件化开发**：复杂页面拆分为独立组件，提高代码可维护性
- **状态管理**：主组件负责状态管理，子组件通过props接收数据
- **模块化设计**：代码模块化、注释清晰，便于团队协作

### 组件拆分策略
1. **筛选器组件**：独立的筛选条件输入组件
2. **表格组件**：数据展示和操作的表格组件
3. **弹窗组件**：新增/编辑的表单弹窗组件
4. **主组件**：负责数据获取、状态管理和业务逻辑

### 开发优先级
- 先实现核心功能，再扩展高级特性
- 测试用例覆盖所有接口
- 响应式设计，适配不同屏幕尺寸
- 错误处理和用户友好的提示信息

---

## 七、配置管理

### 统一配置架构
- **配置文件**：`frontend/src/config/appConfig.json` - 集中管理所有应用配置项
- **导出模块**：`frontend/src/config/index.js` - 提供便捷的配置导入和工具函数

### 配置项说明

#### 付款/回款方式配置 (`paymentMethods`)
```json
{
  "paymentMethods": {
    "list": ["现金", "银行转账", "支票", "银行承兑汇票", "商业承兑汇票", "支付宝", "微信支付", "其他"],
    "default": "银行转账",
    "config": {
      "cash": { "label": "现金", "code": "CASH" },
      "bank_transfer": { "label": "银行转账", "code": "BANK_TRANSFER" }
    }
  }
}
```

#### 产品类别配置 (`productCategories`)
```json
{
  "productCategories": {
    "list": ["电子产品", "机械设备", "办公用品", "原材料", "化工产品", "其他"],
    "default": "其他"
  }
}
```

### 配置使用方式
```javascript
// 导入配置
import { PAYMENT_METHODS, PRODUCT_CATEGORIES, DEFAULT_PAYMENT_METHOD } from '../config';

// 使用工具函数
import { getPaymentMethodOptions, getProductCategoryOptions } from '../config';
```

### 扩展性
- **导出格式**：支持Excel、CSV等多种格式
- **导出范围**：支持全量导出和条件筛选
- **导出模式**：支持实时导出和后台任务
- **文件管理**：自动生成时间戳文件名，避免冲突

### 维护说明
- **添加新配置**：直接在 `appConfig.json` 中添加配置项
- **修改生效**：修改配置文件后重启应用即可生效
- **版本控制**：配置变更可通过Git跟踪，便于团队协作
- **扩展性**：支持添加更多配置项，如系统设置、UI主题等

---

## 八、日志管理

### 日志架构
- **日志库**：Winston - 企业级日志管理，支持多种传输方式和格式
- **环境区分**：开发环境仅控制台输出，生产环境写入文件
- **日志目录**：`/data/log/` - 集中存储所有日志文件

### 日志文件说明
| 文件名 | 说明 | 级别 | 大小限制 | 文件数 |
|---|---|---|---|---|
| `app.log` | 应用主日志（包含所有info及以上级别） | info+ | 10MB | 10个 |
| `error.log` | 错误日志（仅错误信息） | error | 10MB | 10个 |
| `access.log` | HTTP访问日志（请求/响应记录） | info | 10MB | 10个 |

### 日志格式
- **JSON格式**：结构化日志，便于分析和监控
- **时间戳**：YYYY-MM-DD HH:mm:ss 格式
- **服务标识**：myf-db-system
- **自动轮转**：文件大小达到10MB自动轮转，保留10个历史文件

### 日志内容
#### 应用日志 (app.log)
- 服务器启动/关闭
- 数据库操作
- API请求处理
- 业务逻辑执行

#### 错误日志 (error.log)
- API错误详情
- 数据库错误
- 未捕获异常
- 系统错误

#### 访问日志 (access.log)
- HTTP请求方法、URL、IP
- 响应状态码、处理时间
- 用户代理信息

### 日志工具命令
```bash
# 查看应用日志
npm run logs:view

# 查看错误日志  
npm run logs:error

# 查看访问日志
npm run logs:access

# 清理日志文件
npm run clean:logs
```

### 开发建议
- **业务代码集成**：在关键业务节点使用 `logger.info()`, `logger.error()` 记录日志
- **错误处理**：统一错误处理中间件自动记录错误日志
- **性能监控**：记录API响应时间，便于性能分析
- **安全审计**：记录敏感操作，如数据修改、删除等

### 生产环境部署
- **日志目录权限**：确保应用有 `/data/log/` 目录的读写权限
- **日志监控**：建议配置日志监控工具监控错误日志
- **定期清理**：根据存储空间定期清理旧日志文件
- **备份策略**：重要日志文件可配置备份策略

---

## 十、数据分析功能架构

### 功能概述
数据分析页面支持按时间区间、客户、产品维度进行销售数据分析，计算销售额、成本、利润和利润率。

**新增详细分析功能（2025年8月）**：
- **按客户分析**：当选择指定客户但产品为All时，显示该客户各产品的销售明细表格
- **按产品分析**：当选择指定产品但客户为All时，显示该产品各客户的销售明细表格
- **智能过滤**：只显示销售额大于0的记录，避免无意义的空数据
- **双重缓存**：基础分析数据和详细分析数据分别缓存，提升性能

**用户体验优化（2025年8月最新）**：
- **模块化组件架构**：重构为独立的功能组件，提升代码可维护性
- **智能验证机制**：前端验证防止无效API请求，要求至少选择一个筛选条件
- **自动清空状态**：不选择筛选条件时自动清空数据显示，避免混淆
- **多语言支持**：完整的中英韩三语提示信息

### 前端组件架构（重构后）

```
Analysis/
├── index.jsx                    # 主页面（130行，大幅精简）
├── components/
│   ├── AnalysisFilters.jsx     # 筛选条件和操作按钮
│   ├── AnalysisStatistics.jsx  # 统计数据卡片展示
│   ├── AnalysisDetailTable.jsx # 详细数据表格
│   ├── AnalysisConditions.jsx  # 分析条件显示
│   └── AdvancedExportModal.jsx # 高级导出模态框
└── hooks/
    ├── useAnalysisData.js      # 数据获取和管理逻辑
    └── useAnalysisExport.js    # 导出功能逻辑
```

**组件职责分离**：
- **AnalysisFilters**: 负责筛选条件输入和操作按钮
- **AnalysisStatistics**: 负责四个关键指标的卡片展示
- **AnalysisDetailTable**: 负责详细分析表格的显示逻辑
- **AnalysisConditions**: 负责当前分析条件的展示
- **useAnalysisData**: 集中管理所有数据获取逻辑
- **useAnalysisExport**: 集中管理导出功能逻辑

### 用户交互逻辑

**初始状态**：
- 时间区间默认为上个月（符合分析习惯）
- 客户和产品筛选默认为空（不自动选择ALL）
- 不自动发送API请求，避免无意义的数据查询

**验证机制**：
- **时间验证**：必须选择时间区间
- **筛选验证**：至少选择一个筛选条件（客户或产品）
- **数据验证**：必须有分析数据才能进行导出操作

**智能提示**：
- 未选择时间区间：提示"请选择时间区间"
- 未选择筛选条件：提示"请至少选择一个筛选条件（客户或产品）"
- 无数据导出：提示"暂无数据可导出"

### 缓存机制设计
**缓存文件**：`/data/analysis-cache.json`

**缓存策略**：
- **读写分离**：GET 请求只读缓存，POST 请求重新计算并写入缓存
- **自动过期**：自动清理30天以上的过期缓存，防止缓存文件无限增长
- **缓存键规则**：`${start_date}_${end_date}_${customer_code || 'ALL'}_${product_model || 'ALL'}`

**缓存数据结构**：
```json
{
  "2025-01-01_2025-01-31_ALL_ALL": {
    "sales_amount": 150000.00,
    "cost_amount": 120000.00,
    "profit_amount": 30000.00,
    "profit_rate": 20.00,
    "query_params": {
      "start_date": "2025-01-01",
      "end_date": "2025-01-31",
      "customer_code": "ALL",
      "product_model": "ALL"
    },
    "last_updated": "2025-08-04T10:30:00.000Z"
  },
  "detail_2025-01-01_2025-01-31_C001_ALL": {
    "detail_data": [
      {
        "group_key": "iPhone 15 Pro",
        "customer_code": "C001",
        "product_model": "iPhone 15 Pro",
        "sales_amount": 50000.00,
        "cost_amount": 40000.00,
        "profit_amount": 10000.00,
        "profit_rate": 20.00
      }
    ],
    "last_updated": "2025-08-04T10:30:00.000Z"
  }
}
```

### 计算逻辑
**销售额计算**：
- 正数单价出库记录的销售额汇总
- 减去负数单价出库记录的特殊支出

**成本计算**：
- 采用加权平均成本法，参考概览页面的 `calculateSoldGoodsCost` 函数
- 基于全时间范围的入库记录计算各产品的平均成本
- 根据指定条件的出库记录计算实际成本

**利润和利润率**：
- 利润 = 销售额 - 成本
- 利润率 = (利润 / 销售额) × 100%

### API 接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/analysis/data | 获取分析数据（从缓存读取） |
| GET | /api/analysis/detail | 获取详细分析数据（从缓存读取，支持按客户或产品分组的明细数据） |
| POST | /api/analysis/refresh | 刷新分析数据（重新计算并写入缓存） |
| GET | /api/analysis/filter-options | 获取筛选选项（客户和产品列表） |
| POST | /api/analysis/clean-cache | 手动清理过期缓存 |

### 前端设计
**筛选条件**：
- 时间区间选择器（Ant Design RangePicker）
- 客户选择下拉框（包含"全部客户"选项）
- 产品选择下拉框（包含"全部产品"选项）

**数据展示**：
- 销售额、成本、利润、利润率四个关键指标
- 使用 Ant Design Statistic 组件展示
- 支持正负数颜色区分（绿色表示盈利，红色表示亏损）
- **详细分析表格**：当选择指定客户但产品为All时，显示该客户各产品销售明细；当选择指定产品但客户为All时，显示该产品各客户销售明细
- **智能筛选显示**：只有满足条件（一个维度指定，另一个维度为All）且有销售数据时才显示详细表格
- **数据导出功能**：支持将当前页面的分析数据导出为Excel文件，包括汇总数据工作表和详细分析工作表

**用户体验**：
- 筛选条件变化时自动获取缓存数据
- 手动刷新按钮重新计算最新数据
- **数据导出按钮**：支持将当前分析结果导出为Excel文件，包含汇总和详细数据
- Loading 状态和错误提示
- 显示数据更新时间
- **AutoComplete输入框**：客户和产品选择支持输入搜索，提升用户体验
- **智能时间默认值**：时间区间默认为上个月第一天到最后一天，符合分析习惯

### 精确计算
- **全程使用 decimal.js**：确保所有金额、成本、利润计算的精度
- **数据库结果处理**：使用 `decimalCalc.fromSqlResult()` 处理 SQL 查询结果
- **存储格式转换**：使用 `decimalCalc.toDbNumber()` 转换为数据库存储格式

### 性能优化
- **缓存优先**：优先读取缓存数据，避免重复计算
- **双重缓存机制**：基础分析数据和详细分析数据分别缓存，独立管理
- **自动清理**：定期清理过期缓存，控制文件大小
- **精确索引**：使用精确的缓存键避免数据冲突
- **错误处理**：完善的异常处理确保系统稳定性

### 测试建议
- **功能测试**：测试不同客户/产品组合的详细分析显示
- **边界测试**：测试销售额为0的情况（应不显示在详细表格中）
- **缓存测试**：测试缓存读写机制和过期清理功能
- **多语言测试**：验证中文、英文、韩文界面的正确显示
- **导出测试**：验证Excel导出功能的正确性，包括汇总数据和详细表格的格式

### 分析数据导出功能

**导出API接口**：`POST /api/export/analysis`

**导出内容**：
- **数据分析汇总工作表**：包含销售额、成本、利润、利润率等关键指标，以及分析条件和更新时间
- **详细分析工作表**：根据筛选条件动态生成的详细明细表格，支持三种模式：
  - 按产品分析：当选择指定客户时，显示该客户各产品的销售明细
  - 按客户分析：当选择指定产品时，显示该产品各客户的销售明细  
  - 完整分析：同时包含客户和产品信息的完整明细

**Excel模板配置**：
- `analysis_summary`：数据分析汇总工作表模板
- `analysis_detail_by_product`：按产品分析的工作表模板
- `analysis_detail_by_customer`：按客户分析的工作表模板
- `analysis_detail`：完整分析的工作表模板

**导出特性**：
- **智能表格布局**：根据分析维度自动选择合适的表格模板和列配置
- **格式化数据**：金额自动格式化为中文货币格式，利润率显示为百分比
- **客户名称映射**：前端自动将客户代号映射为客户简称，提升可读性
- **条件信息**：在汇总表中包含分析条件（时间范围、客户、产品）和更新时间
- **即时下载**：点击导出按钮后立即生成并下载Excel文件，无需等待

**技术实现**：
- 使用前端当前显示的分析数据进行导出，确保所见即所得
- 后端根据筛选条件智能选择表格模板，优化Excel布局
- 支持空数据情况下的优雅处理，避免导出空表格

### 高级分析导出功能

**导出API接口**：`POST /api/export/analysis/advanced`

**触发条件**：当客户和产品都选择"ALL"时，点击导出按钮将弹出高级导出选项Modal

**导出模式**：
- **按客户分类导出**：为每个有销售记录的客户创建独立工作表，包含：
  - 客户销售汇总信息（总销售额、总成本、总利润、利润率）
  - 该客户所有产品的详细销售明细（产品型号、销售额、成本、利润、利润率）
  - 自动过滤销售额为0的记录
- **按产品分类导出**：为每个有销售记录的产品创建独立工作表，包含：
  - 产品销售汇总信息（总销售额、总成本、总利润、利润率）
  - 该产品所有客户的详细销售明细（客户代号、客户名称、销售额、成本、利润、利润率）
  - 自动过滤销售额为0的记录

**Excel模板配置**：
- `analysis_customer_summary`：按客户导出的汇总信息模板
- `analysis_customer_detail`：按客户导出的产品明细模板
- `analysis_product_summary`：按产品导出的汇总信息模板
- `analysis_product_detail`：按产品导出的客户明细模板

**前端组件**：
- `AdvancedExportModal.jsx`：高级导出选项Modal组件
  - 提供导出方式选择（按客户分类/按产品分类）
  - 显示预估的工作表数量和数据范围
  - 支持取消和确认导出操作

**数据过滤规则**：
- 只导出指定时间范围内有实际销售记录的数据
- 自动忽略销售额为0或负数的记录
- 只为有有效销售数据的客户/产品创建工作表

**技术特性**：
- **批量数据处理**：后端一次性查询所有相关数据，减少数据库查询次数
- **内存优化**：分批处理大数据量，避免内存溢出
- **智能命名**：工作表名称使用客户简称或产品型号，确保可读性
- **进度反馈**：导出过程中提供适当的Loading状态反馈

### 代码优化与重构（2025年8月）

**重构成果**：
- **代码量减少**: 主文件从572行减少到130行（77%减少）
- **组件化**: 拆分为6个独立组件和2个自定义hooks
- **可维护性**: 单一职责原则，每个文件功能明确
- **可复用性**: 组件和hooks可在其他页面复用

**性能优化**：
- **智能API调用**: 避免无效的API请求，只在有筛选条件时才获取数据
- **前端验证**: 完整的输入验证，防止错误请求到达后端
- **状态管理**: 使用自定义hooks集中管理状态逻辑

**用户体验提升**：
- **智能默认值**: 时间区间默认上个月，筛选条件默认为空
- **实时反馈**: 完善的loading状态和错误提示
- **多语言支持**: 所有提示信息支持中英韩三语
- **渐进式操作**: 引导用户逐步完成筛选和分析操作

**开发效率提升**：
- **模块化开发**: 可并行开发不同组件
- **独立测试**: 每个组件可单独测试和调试
- **代码复用**: hooks可在其他功能模块中复用
- **易于扩展**: 新增功能只需添加新组件，不影响现有代码

---

## 十一、精确计算架构（decimal.js）

### 浮点数精度问题解决方案

**问题背景**：
- JavaScript 原生浮点数运算存在精度问题（如 `0.1 + 0.2 = 0.30000000000000004`）
- 财务系统对计算精度要求极高，浮点数误差会导致账务不平衡
- 原项目使用 `Math.round((quantity * unit_price) * 100) / 100` 方法仍存在精度隐患

**解决方案**：
- **全面集成 decimal.js**：高精度小数运算库，避免浮点数精度问题
- **统一计算接口**：创建 `decimalCalculator.js` 工具类，封装所有数值计算逻辑
- **后端全覆盖**：所有涉及金额、价格、余额的计算均使用 decimal.js

### decimal.js 工具类核心功能

**文件位置**：`backend/utils/decimalCalculator.js`

**精度升级**：
- **升级时间**：2025年8月（最新）
- **精度等级**：从 2-4 位小数升级到 5 位小数（0.00001 级别）
- **升级原因**：支持更高精度的商品单价和复杂计算场景
- **兼容性**：向前兼容，现有数据无需迁移

**主要方法**：
```javascript
// 基础运算
decimalCalc.add(a, b)           // 加法
decimalCalc.subtract(a, b)      // 减法  
decimalCalc.multiply(a, b)      // 乘法
decimalCalc.divide(a, b)        // 除法

// 业务计算
decimalCalc.calculateTotalPrice(quantity, unitPrice)    // 总价计算
decimalCalc.calculateBalance(totalAmount, paidAmount)   // 余额计算  
decimalCalc.calculateProfit(sales, cost)               // 利润计算
decimalCalc.calculateWeightedAverage(items)            // 加权平均

// 数据转换
decimalCalc.fromSqlResult(sqlResult, defaultValue, decimalPlaces)  // SQL结果处理
decimalCalc.toDbNumber(value, decimalPlaces)                       // 数据库存储格式
decimalCalc.batchCalculateTotalPrice(records)                      // 批量计算
```

### 升级覆盖范围

**1. 入库/出库记录**
- `routes/inbound.js`：总价计算 `quantity × unit_price`
- `routes/outbound.js`：总价计算 `quantity × unit_price`
- 替换：`Math.round((quantity * unit_price) * 100) / 100` → `decimalCalc.calculateTotalPrice(quantity, unit_price)`

**2. 应收/应付账款**
- `routes/receivable.js`：余额计算 `total_receivable - total_paid`
- `routes/payable.js`：余额计算 `total_payable - total_paid`
- 应用层重新计算，确保精度

**3. 概览统计计算**
- `routes/overview.js`：
  - 已售商品成本计算（加权平均成本法）
  - 销售额/采购额聚合计算
  - 利润率计算
  - 销售额前10商品统计及"其他"合计
  - 本月库存变化量计算

**4. 数据分析计算**
- `routes/analysis.js`：
  - 按时间区间、客户、产品维度的销售额计算
  - 成本计算（加权平均成本法）
  - 利润和利润率计算
  - 特殊收入/支出处理

**5. 导出查询模块**
- `utils/exportQueries.js`：应收/应付汇总余额计算
- `utils/reportService.js`：财务报表利润和现金流计算

**6. 数据库升级工具**
- `utils/dbUpgrade.js`：历史数据迁移时的计算修正

### 精度配置

**decimal.js 配置**：
```javascript
Decimal.config({
  precision: 20,                    // 20位有效数字
  rounding: Decimal.ROUND_HALF_UP,  // 四舍五入
  toExpNeg: -9,                     // 负指数阈值
  toExpPos: 21,                     // 正指数阈值
  modulo: Decimal.ROUND_DOWN,
  crypto: false
});
```

**数据精度标准**：
- **金额/价格**：保留 5 位小数（如：1234.56789）- 支持 0.00001 级别精度
- **单价**：保留 5 位小数（如：0.12345）- 高精度单价支持
- **数量**：保留 0 位小数（整数）
- **百分比**：保留 1 位小数（如：12.3%）
- **加权平均**：保留 5 位小数 - 确保价格计算精确性

### 测试验证

**测试文件**：
- `backend/test-decimal.js`：基础计算功能测试
- `backend/test-precision-5digits.js`：高精度计算测试（0.00001级别精度验证）
- `backend/test-sales-precision.js`：销售额精度测试

**测试覆盖**：
- 基础四则运算精度验证
- 总价计算对比（原生 JS vs decimal.js）
- 余额计算精度测试（5位小数）
- 加权平均价格计算（高精度）
- SQL结果处理和批量计算
- 浮点数精度问题修复验证
- 0.00001 级别的边界精度测试
- 高精度单价和总价计算验证

### 性能影响

**性能考虑**：
- decimal.js 相比原生运算略有性能开销
- 通过合理的缓存和批量处理优化性能
- 对于财务系统，精度比性能更重要
- 实际使用中性能影响可忽略不计

**优化策略**：
- 在数据库存储前转换为原生数字类型
- 批量计算时复用 Decimal 实例
- 避免频繁的字符串/数字转换

### 开发建议

**新增计算逻辑**：
```javascript
// ❌ 避免使用原生运算
const result = price * quantity + tax;

// ✅ 使用 decimal.js 工具
const result = decimalCalc.add(
  decimalCalc.multiply(price, quantity), 
  tax
);
```

**数据库操作**：
```javascript
// 存储前转换
const dbValue = decimalCalc.toDbNumber(calculatedValue, 2);

// 读取后处理
const safeValue = decimalCalc.fromSqlResult(row.amount, 0, 2);
```

**API 返回**：
- 所有金额字段都经过 decimal.js 处理
- 确保前端接收到的数据精度正确
- 避免在前端进行精度敏感的计算

---

> 本文件为LLM/AI开发辅助文档，便于理解项目结构、API和业务规则，适合自动化代码生成和智能对话。
> 
> **重要更新**：项目已全面完成 decimal.js 精确计算升级（2025年8月），解决了所有浮点数精度问题，确保财务数据的准确性。所有金额、价格、余额相关计算均使用高精度算法。
