// 发票导出器
const XLSX = require('xlsx');
const ExportUtils = require('./exportUtils');

class InvoiceExporter {
  constructor(templates) {
    this.templates = templates;
  }

  /**
   * 导出发票明细
   * @param {Array} data - 发票数据
   * @param {Object} options - 导出选项
   * @returns {Buffer} Excel文件Buffer
   */
  exportInvoice(data, options = {}) {
    const workbook = XLSX.utils.book_new();
    
    if (data && data.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data, this.templates.invoice);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.invoice.sheetName);
    } else {
      // 如果没有数据，创建一个空的工作表
      const worksheet = ExportUtils.createWorksheet([], this.templates.invoice);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.invoice.sheetName);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = InvoiceExporter;
