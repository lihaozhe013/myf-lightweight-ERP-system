// 应收应付导出器
const XLSX = require('xlsx');
const ExportUtils = require('./exportUtils');

class FinancialExporter {
  constructor(templates) {
    this.templates = templates;
  }

  /**
   * 导出应收应付明细
   * @param {Object} data - 数据对象
   * @returns {Buffer} Excel文件Buffer
   */
  exportReceivablePayable(data) {
    const workbook = XLSX.utils.book_new();
    
    // 应收账款汇总
    if (data.receivable_summary && data.receivable_summary.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.receivable_summary, this.templates.receivable_summary);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.receivable_summary.sheetName);
    }
    
    // 应收明细
    if (data.receivable_details && data.receivable_details.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.receivable_details, this.templates.receivable_details);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.receivable_details.sheetName);
    }
    
    // 回款记录
    if (data.receivable_payments && data.receivable_payments.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.receivable_payments, this.templates.receivable_payments);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.receivable_payments.sheetName);
    }
    
    // 应付账款汇总
    if (data.payable_summary && data.payable_summary.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.payable_summary, this.templates.payable_summary);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.payable_summary.sheetName);
    }
    
    // 应付明细
    if (data.payable_details && data.payable_details.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.payable_details, this.templates.payable_details);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.payable_details.sheetName);
    }
    
    // 付款记录
    if (data.payable_payments && data.payable_payments.length > 0) {
      const worksheet = ExportUtils.createWorksheet(data.payable_payments, this.templates.payable_payments);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.payable_payments.sheetName);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = FinancialExporter;
