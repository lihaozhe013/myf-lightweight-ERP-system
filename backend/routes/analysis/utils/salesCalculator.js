const db = require('../../../db');
const decimalCalc = require('../../../utils/decimalCalculator');

/**
 * 计算销售额数据
 * @param {string} startDate 开始日期
 * @param {string} endDate 结束日期
 * @param {string} customerCode 客户代号（可选）
 * @param {string} productModel 产品型号（可选）
 * @param {Function} callback 回调函数 (err, salesData)
 */
function calculateSalesData(startDate, endDate, customerCode, productModel, callback) {
  // 1. 构建销售额查询条件
  let salesSqlConditions = ['unit_price >= 0', 'date(outbound_date) BETWEEN ? AND ?'];
  let salesParams = [startDate, endDate];
  
  if (customerCode && customerCode !== 'All') {
    salesSqlConditions.push('customer_code = ?');
    salesParams.push(customerCode);
  }
  
  if (productModel && productModel !== 'All') {
    salesSqlConditions.push('product_model = ?');
    salesParams.push(productModel);
  }
  
  const salesSql = `
    SELECT 
      COALESCE(SUM(quantity * unit_price), 0) as normal_sales,
      COALESCE((
        SELECT SUM(ABS(quantity * unit_price)) 
        FROM outbound_records 
        WHERE unit_price < 0 
          AND date(outbound_date) BETWEEN ? AND ?
          ${customerCode && customerCode !== 'All' ? 'AND customer_code = ?' : ''}
          ${productModel && productModel !== 'All' ? 'AND product_model = ?' : ''}
      ), 0) as special_expense
    FROM outbound_records 
    WHERE ${salesSqlConditions.join(' AND ')}
  `;
  
  // 构建特殊支出查询的参数
  let specialExpenseParams = [startDate, endDate];
  if (customerCode && customerCode !== 'All') {
    specialExpenseParams.push(customerCode);
  }
  if (productModel && productModel !== 'All') {
    specialExpenseParams.push(productModel);
  }
  
  const finalSalesParams = [...salesParams, ...specialExpenseParams];
  
  db.get(salesSql, finalSalesParams, (err, salesRow) => {
    if (err) {
      console.error('计算销售额失败:', err);
      return callback(err);
    }
    
    // 使用 decimal.js 精确计算销售额
    const normalSales = decimalCalc.fromSqlResult(salesRow.normal_sales, 0, 2);
    const specialExpense = decimalCalc.fromSqlResult(salesRow.special_expense, 0, 2);
    const salesAmount = decimalCalc.toDbNumber(decimalCalc.subtract(normalSales, specialExpense), 2);
    
    callback(null, {
      normal_sales: normalSales,
      special_expense: specialExpense,
      sales_amount: salesAmount
    });
  });
}

module.exports = {
  calculateSalesData
};
