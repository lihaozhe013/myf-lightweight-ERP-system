// 交易记录导出器
const XLSX = require('xlsx');
const ExportUtils = require('./exportUtils');

class TransactionExporter {
  constructor(templates) {
    this.templates = templates;
  }

  /**
   * 导出入库出库记录
   * @param {Object} data - 数据对象
   * @param {Object} options - 导出选项
   * @returns {Buffer} Excel文件Buffer
   */
  exportInboundOutbound(data, options = {}) {
    const workbook = XLSX.utils.book_new();
    
    // 1: 入库记录
    if (options.tables?.includes('1') && data.inbound) {
      const worksheet = ExportUtils.createWorksheet(data.inbound, this.templates.inbound);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.inbound.sheetName);
    }
    
    // 2: 出库记录
    if (options.tables?.includes('2') && data.outbound) {
      const worksheet = ExportUtils.createWorksheet(data.outbound, this.templates.outbound);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.outbound.sheetName);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 导出对账单（特殊格式的入库出库记录）
   * @param {Object} data - 数据对象
   * @param {Object} options - 导出选项
   * @returns {Buffer} Excel文件Buffer
   */
  exportStatement(data, options = {}) {
    const workbook = XLSX.utils.book_new();
    
    // 1: 入库记录（对账单格式）
    if (options.tables?.includes('1') && data.inbound) {
      const worksheet = ExportUtils.createWorksheet(data.inbound, this.templates.inbound_statement);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.inbound_statement.sheetName);
    }
    
    // 2: 出库记录（对账单格式）
    if (options.tables?.includes('2') && data.outbound) {
      const worksheet = ExportUtils.createWorksheet(data.outbound, this.templates.outbound_statement);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.outbound_statement.sheetName);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = TransactionExporter;
