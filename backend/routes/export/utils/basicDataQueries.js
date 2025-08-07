// 基础数据查询模块
const db = require('../../../db');

class BasicDataQueries {
  /**
   * 获取基础信息数据
   * @param {string} tables - 要导出的表格，如 '123'
   * @returns {Promise<Object>} 返回包含各表数据的对象
   */
  async getBaseInfoData(tables = '123') {
    const result = {};
    
    // 1: 客户供应商数据
    if (tables.includes('1')) {
      result.partners = await this.getPartnersData();
    }
    
    // 2: 产品数据
    if (tables.includes('2')) {
      result.products = await this.getProductsData();
    }
    
    // 3: 产品价格数据
    if (tables.includes('3')) {
      result.prices = await this.getPricesData();
    }
    
    return result;
  }

  /**
   * 获取客户供应商数据
   */
  getPartnersData() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT code, short_name, full_name, 
               CASE WHEN type = 0 THEN '供应商' ELSE '客户' END as type_name,
               address, contact_person, contact_phone 
        FROM partners 
        ORDER BY short_name
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 获取产品数据
   */
  getProductsData() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT code, category, product_model, remark 
        FROM products 
        ORDER BY category, product_model
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 获取产品价格数据
   */
  getPricesData() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT partner_short_name, product_model, effective_date, unit_price 
        FROM product_prices 
        ORDER BY partner_short_name, product_model, effective_date DESC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = BasicDataQueries;
