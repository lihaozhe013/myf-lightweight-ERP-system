// 导出工具函数
class ExportUtils {
  /**
   * 生成文件名
   * @param {string} exportType - 导出类型
   * @returns {string} 文件名
   */
  static generateFilename(exportType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const typeMap = {
      'base-info': '基础信息导出',
      'inbound-outbound': '入库出库记录导出',
      'receivable-payable': '应收应付明细导出',
      'invoice': '发票导出',
      'statement': '对账单导出',
      'analysis': '数据分析导出'
    };
    const typeName = typeMap[exportType] || exportType;
    return `${typeName}_${timestamp}.xlsx`;
  }

  /**
   * 创建工作表的通用方法
   * @param {Array} data - 数据数组
   * @param {Object} template - 模板配置
   * @returns {Object} 工作表对象
   */
  static createWorksheet(data, template) {
    const XLSX = require('xlsx');
    
    // 创建表头
    const headers = template.columns.map(col => col.label);
    
    // 创建数据行
    const rows = data.map(item => 
      template.columns.map(col => {
        const value = item[col.key];
        // 处理数值类型
        if (typeof value === 'number') {
          return value;
        }
        // 处理其他类型，确保返回字符串
        return value != null ? String(value) : '';
      })
    );
    
    // 合并表头和数据
    const sheetData = [headers, ...rows];
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // 设置列宽
    const colWidths = template.columns.map(col => {
      // 根据列标签长度设置基础宽度
      const labelWidth = col.label.length * 2;
      // 根据数据类型设置宽度
      let dataWidth = 10;
      if (col.key.includes('date')) {
        dataWidth = 12;
      } else if (col.key.includes('price') || col.key.includes('amount')) {
        dataWidth = 15;
      } else if (col.key.includes('name') || col.key.includes('address')) {
        dataWidth = 20;
      }
      return { wch: Math.max(labelWidth, dataWidth) };
    });
    
    worksheet['!cols'] = colWidths;
    
    return worksheet;
  }
}

module.exports = ExportUtils;
