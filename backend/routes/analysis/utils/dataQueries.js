const db = require('../../../db');

/**
 * 获取筛选选项（客户和产品列表）
 */
function getFilterOptions(callback) {
  // 查询所有客户
  const customerSql = `
    SELECT code, short_name, full_name 
    FROM partners 
    WHERE type = 1 
    ORDER BY short_name
  `;
  
  // 查询所有产品
  const productSql = `
    SELECT code, product_model 
    FROM products 
    ORDER BY product_model
  `;
  
  db.all(customerSql, [], (err1, customers) => {
    if (err1) {
      console.error('查询客户列表失败:', err1);
      return callback(err1);
    }
    
    db.all(productSql, [], (err2, products) => {
      if (err2) {
        console.error('查询产品列表失败:', err2);
        return callback(err2);
      }
      
      // 组装筛选选项
      const customerOptions = [
        { code: 'All', name: 'All' },
        ...customers.map(c => ({
          code: c.code,
          name: `${c.short_name} (${c.full_name})`
        }))
      ];
      
      const productOptions = [
        { model: 'All', name: 'All' },
        ...products.map(p => ({
          model: p.product_model,
          name: p.product_model
        }))
      ];
      
      callback(null, {
        customers: customerOptions,
        products: productOptions
      });
    });
  });
}

module.exports = {
  getFilterOptions
};
