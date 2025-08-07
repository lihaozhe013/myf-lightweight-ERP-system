// 交易数据查询模块
const db = require('../../../db');

class TransactionQueries {
  /**
   * 获取入库出库数据
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 返回包含入库出库数据的对象
   */
  async getInboundOutboundData(filters = {}) {
    const { tables = '12', dateFrom, dateTo, productCode, customerCode } = filters;
    const result = {};
    
    // 1: 入库记录
    if (tables.includes('1')) {
      result.inbound = await this.getInboundData({ dateFrom, dateTo, productCode, customerCode });
    }
    
    // 2: 出库记录
    if (tables.includes('2')) {
      result.outbound = await this.getOutboundData({ dateFrom, dateTo, productCode, customerCode });
    }
    
    return result;
  }

  /**
   * 获取入库数据
   */
  getInboundData(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, supplier_code, supplier_short_name, supplier_full_name,
               product_code, product_model, quantity, unit_price, total_price,
               inbound_date, invoice_date, invoice_number, order_number, remark
        FROM inbound_records 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.dateFrom) {
        sql += ' AND inbound_date >= ?';
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ' AND inbound_date <= ?';
        params.push(filters.dateTo);
      }
      if (filters.productCode) {
        sql += ' AND (product_code LIKE ? OR product_model LIKE ?)';
        params.push(`%${filters.productCode}%`, `%${filters.productCode}%`);
      }
      if (filters.customerCode) {
        sql += ' AND (supplier_code LIKE ? OR supplier_short_name LIKE ?)';
        params.push(`%${filters.customerCode}%`, `%${filters.customerCode}%`);
      }
      
      sql += ' ORDER BY inbound_date DESC, id DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 获取出库数据
   */
  getOutboundData(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, customer_code, customer_short_name, customer_full_name,
               product_code, product_model, quantity, unit_price, total_price,
               outbound_date, invoice_date, invoice_number, order_number, remark
        FROM outbound_records 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.dateFrom) {
        sql += ' AND outbound_date >= ?';
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ' AND outbound_date <= ?';
        params.push(filters.dateTo);
      }
      if (filters.productCode) {
        sql += ' AND (product_code LIKE ? OR product_model LIKE ?)';
        params.push(`%${filters.productCode}%`, `%${filters.productCode}%`);
      }
      if (filters.customerCode) {
        sql += ' AND (customer_code LIKE ? OR customer_short_name LIKE ?)';
        params.push(`%${filters.customerCode}%`, `%${filters.customerCode}%`);
      }
      
      sql += ' ORDER BY outbound_date DESC, id DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = TransactionQueries;
