// 发票数据查询模块
const db = require('../../../db');

class InvoiceQueries {
  /**
   * 获取发票数据（按产品合并，相同产品相同单价的记录进行数量和总金额合并）
   * @param {Object} filters - 筛选条件
   * @param {string} filters.partnerCode - 合作伙伴代号（必填）
   * @param {string} filters.dateFrom - 开始日期
   * @param {string} filters.dateTo - 结束日期
   * @returns {Promise<Array>} 返回发票数据数组
   */
  async getInvoiceData(filters = {}) {
    const { partnerCode, dateFrom, dateTo } = filters;
    
    if (!partnerCode) {
      throw new Error('合作伙伴代号是必填项');
    }

    return new Promise((resolve, reject) => {
      // 合并入库和出库记录，按产品型号和单价分组求和
      let sql = `
        SELECT 
          product_model,
          unit_price,
          SUM(quantity) as quantity,
          SUM(total_price) as total_price
        FROM (
          -- 入库记录
          SELECT 
            product_model,
            unit_price,
            quantity,
            total_price
          FROM inbound_records 
          WHERE (supplier_code = ? OR supplier_short_name = ?)
          ${dateFrom ? 'AND inbound_date >= ?' : ''}
          ${dateTo ? 'AND inbound_date <= ?' : ''}
          
          UNION ALL
          
          -- 出库记录
          SELECT 
            product_model,
            unit_price,
            quantity,
            total_price
          FROM outbound_records 
          WHERE (customer_code = ? OR customer_short_name = ?)
          ${dateFrom ? 'AND outbound_date >= ?' : ''}
          ${dateTo ? 'AND outbound_date <= ?' : ''}
        ) as combined_records
        GROUP BY product_model, unit_price
        ORDER BY product_model, unit_price
      `;
      
      const params = [partnerCode, partnerCode];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);
      params.push(partnerCode, partnerCode);
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}

module.exports = InvoiceQueries;
