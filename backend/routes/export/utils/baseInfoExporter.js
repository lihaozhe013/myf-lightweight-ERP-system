// 基础信息导出器
const XLSX = require('xlsx');
const ExportUtils = require('./exportUtils');

class BaseInfoExporter {
  constructor(templates) {
    this.templates = templates;
  }

  /**
   * 导出基础信息
   * @param {Object} data - 数据对象
   * @param {Object} options - 导出选项
   * @returns {Buffer} Excel文件Buffer
   */
  export(data, options = {}) {
    const { tables = '123' } = options;
    const workbook = XLSX.utils.book_new();
    
    // 1: 客户供应商
    if (tables.includes('1') && data.partners) {
      const worksheet = ExportUtils.createWorksheet(data.partners, this.templates.partners);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.partners.sheetName);
    }
    
    // 2: 产品信息
    if (tables.includes('2') && data.products) {
      const worksheet = ExportUtils.createWorksheet(data.products, this.templates.products);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.products.sheetName);
    }
    
    // 3: 产品价格
    if (tables.includes('3') && data.prices) {
      const worksheet = ExportUtils.createWorksheet(data.prices, this.templates.prices);
      XLSX.utils.book_append_sheet(workbook, worksheet, this.templates.prices.sheetName);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = BaseInfoExporter;
