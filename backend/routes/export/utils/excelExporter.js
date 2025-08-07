// Excel导出核心类 - 重构版本
const { TEMPLATES } = require('./exportTemplates');
const ExportQueries = require('./index');
const BaseInfoExporter = require('./baseInfoExporter');
const TransactionExporter = require('./transactionExporter');
const FinancialExporter = require('./financialExporter');
const AnalysisExporter = require('./analysisExporter');
const AdvancedAnalysisExporter = require('./advancedAnalysisExporter');
const InvoiceExporter = require('./invoiceExporter');
const ExportUtils = require('./exportUtils');

class ExcelExporter {
  constructor() {
    this.queries = new ExportQueries();
    this.baseInfoExporter = new BaseInfoExporter(TEMPLATES);
    this.transactionExporter = new TransactionExporter(TEMPLATES);
    this.financialExporter = new FinancialExporter(TEMPLATES);
    this.analysisExporter = new AnalysisExporter(TEMPLATES);
    this.advancedAnalysisExporter = new AdvancedAnalysisExporter(TEMPLATES, this.queries);
    this.invoiceExporter = new InvoiceExporter(TEMPLATES);
  }

  /**
   * 导出基础信息
   * @param {Object} options - 导出选项
   * @param {string} options.tables - 要导出的表格，如 '123'
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportBaseInfo(options = {}) {
    try {
      const data = await this.queries.getBaseInfoData(options.tables || '123');
      return this.baseInfoExporter.export(data, options);
    } catch (error) {
      throw new Error(`基础信息导出失败: ${error.message}`);
    }
  }

  /**
   * 导出入库出库记录
   * @param {Object} options - 导出选项
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportInboundOutbound(options = {}) {
    try {
      const data = await this.queries.getInboundOutboundData(options);
      return this.transactionExporter.exportInboundOutbound(data, options);
    } catch (error) {
      throw new Error(`入库出库记录导出失败: ${error.message}`);
    }
  }

  /**
   * 导出应收应付明细
   * @param {Object} options - 导出选项
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportReceivablePayable(options = {}) {
    try {
      const data = await this.queries.getReceivablePayableData(options);
      return this.financialExporter.exportReceivablePayable(data);
    } catch (error) {
      throw new Error(`应收应付明细导出失败: ${error.message}`);
    }
  }

  /**
   * 导出对账单
   * @param {Object} options - 导出选项
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportStatement(options = {}) {
    try {
      const data = await this.queries.getInboundOutboundData(options);
      return this.transactionExporter.exportStatement(data, options);
    } catch (error) {
      throw new Error(`对账单导出失败: ${error.message}`);
    }
  }

  /**
   * 导出分析数据
   * @param {Object} options - 导出选项
   * @param {Object} options.analysisData - 分析汇总数据
   * @param {Array} options.detailData - 详细分析数据
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @param {string} options.customerCode - 客户代号
   * @param {string} options.productModel - 产品型号
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportAnalysis(options = {}) {
    try {
      return this.analysisExporter.exportAnalysis(options);
    } catch (error) {
      throw new Error(`分析数据导出失败: ${error.message}`);
    }
  }

  /**
   * 高级导出分析数据（按客户或产品分类批量导出）
   * @param {Object} options - 导出选项
   * @param {string} options.exportType - 导出类型：'customer' 或 'product'
   * @param {string} options.startDate - 开始日期
   * @param {string} options.endDate - 结束日期
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportAdvancedAnalysis(options = {}) {
    try {
      return await this.advancedAnalysisExporter.exportAdvancedAnalysis(options);
    } catch (error) {
      throw new Error(`高级分析数据导出失败: ${error.message}`);
    }
  }

  /**
   * 导出发票明细
   * @param {Object} options - 导出选项
   * @param {string} options.partnerCode - 合作伙伴代号（必填）
   * @param {string} options.dateFrom - 开始日期
   * @param {string} options.dateTo - 结束日期
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportInvoice(options = {}) {
    try {
      const { partnerCode, dateFrom, dateTo } = options;
      
      if (!partnerCode) {
        throw new Error('合作伙伴代号是必填项');
      }
      
      const data = await this.queries.getInvoiceData({
        partnerCode,
        dateFrom,
        dateTo
      });
      
      return this.invoiceExporter.exportInvoice(data, options);
    } catch (error) {
      throw new Error(`发票导出失败: ${error.message}`);
    }
  }

  /**
   * 创建工作表（保持向后兼容性）
   * @param {Array} data - 数据数组
   * @param {Object} template - 模板配置
   * @returns {Object} 工作表对象
   */
  createWorksheet(data, template) {
    return ExportUtils.createWorksheet(data, template);
  }

  /**
   * 生成文件名
   * @param {string} exportType - 导出类型
   * @returns {string} 文件名
   */
  generateFilename(exportType) {
    return ExportUtils.generateFilename(exportType);
  }
}

module.exports = ExcelExporter;
