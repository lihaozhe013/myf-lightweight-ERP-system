// 高级分析导出器
const XLSX = require('xlsx');

class AdvancedAnalysisExporter {
  constructor(templates, queries) {
    this.templates = templates;
    this.queries = queries;
  }

  /**
   * 高级导出分析数据（按客户或产品分类批量导出）
   * @param {Object} options - 导出选项
   * @returns {Promise<Buffer>} Excel文件Buffer
   */
  async exportAdvancedAnalysis(options = {}) {
    const { exportType, startDate, endDate } = options;
    
    if (!exportType || !['customer', 'product'].includes(exportType)) {
      throw new Error('导出类型必须是 customer 或 product');
    }

    const workbook = XLSX.utils.book_new();
    
    if (exportType === 'customer') {
      // 按客户分类导出
      await this.createCustomerSheets(workbook, startDate, endDate);
    } else {
      // 按产品分类导出
      await this.createProductSheets(workbook, startDate, endDate);
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 创建按客户分类的工作表
   */
  async createCustomerSheets(workbook, startDate, endDate) {
    // 1. 获取所有有销售记录的客户
    const customerData = await this.queries.getCustomerAnalysisData(startDate, endDate);
    
    // 2. 为每个客户创建工作表
    for (const customer of customerData) {
      if (customer.sales_amount > 0) { // 只导出有销售额的客户
        // 客户汇总工作表
        const summaryData = [{
          customer_code: customer.customer_code,
          customer_name: customer.customer_name,
          sales_amount: `¥${Number(customer.sales_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          cost_amount: `¥${Number(customer.cost_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          profit_amount: `¥${Number(customer.profit_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          profit_rate: `${Number(customer.profit_rate || 0).toFixed(2)}%`
        }];

        const summaryWorksheet = this.createWorksheet(summaryData, this.templates.analysis_customer_summary);
        const summarySheetName = `${customer.customer_name}-汇总`.substring(0, 30); // Excel工作表名称限制
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, summarySheetName);

        // 客户产品明细工作表
        if (customer.product_details && customer.product_details.length > 0) {
          const detailData = customer.product_details
            .filter(item => item.sales_amount > 0) // 过滤销售额为0的记录
            .map(item => ({
              product_model: item.product_model,
              sales_amount: `¥${Number(item.sales_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              cost_amount: `¥${Number(item.cost_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              profit_amount: `¥${Number(item.profit_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              profit_rate: `${Number(item.profit_rate || 0).toFixed(2)}%`
            }));

          if (detailData.length > 0) {
            const detailWorksheet = this.createWorksheet(detailData, this.templates.analysis_customer_detail);
            const detailSheetName = `${customer.customer_name}-明细`.substring(0, 30);
            XLSX.utils.book_append_sheet(workbook, detailWorksheet, detailSheetName);
          }
        }
      }
    }
  }

  /**
   * 创建按产品分类的工作表
   */
  async createProductSheets(workbook, startDate, endDate) {
    // 1. 获取所有有销售记录的产品
    const productData = await this.queries.getProductAnalysisData(startDate, endDate);
    
    // 2. 为每个产品创建工作表
    for (const product of productData) {
      if (product.sales_amount > 0) { // 只导出有销售额的产品
        // 产品汇总工作表
        const summaryData = [{
          product_model: product.product_model,
          sales_amount: `¥${Number(product.sales_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          cost_amount: `¥${Number(product.cost_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          profit_amount: `¥${Number(product.profit_amount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          profit_rate: `${Number(product.profit_rate || 0).toFixed(2)}%`
        }];

        const summaryWorksheet = this.createWorksheet(summaryData, this.templates.analysis_product_summary);
        const summarySheetName = `${product.product_model}-汇总`.substring(0, 30);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, summarySheetName);

        // 产品客户明细工作表
        if (product.customer_details && product.customer_details.length > 0) {
          const detailData = product.customer_details
            .filter(item => item.sales_amount > 0) // 过滤销售额为0的记录
            .map(item => ({
              customer_code: item.customer_code,
              customer_name: item.customer_name,
              sales_amount: `¥${Number(item.sales_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              cost_amount: `¥${Number(item.cost_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              profit_amount: `¥${Number(item.profit_amount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              profit_rate: `${Number(item.profit_rate || 0).toFixed(2)}%`
            }));

          if (detailData.length > 0) {
            const detailWorksheet = this.createWorksheet(detailData, this.templates.analysis_product_detail);
            const detailSheetName = `${product.product_model}-明细`.substring(0, 30);
            XLSX.utils.book_append_sheet(workbook, detailWorksheet, detailSheetName);
          }
        }
      }
    }
  }

  /**
   * 创建工作表
   * @param {Array} data - 数据数组
   * @param {Object} template - 模板配置
   * @returns {Object} 工作表对象
   */
  createWorksheet(data, template) {
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

module.exports = AdvancedAnalysisExporter;
