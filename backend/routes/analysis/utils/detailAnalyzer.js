const db = require('../../../db');
const decimalCalc = require('../../../utils/decimalCalculator');
const { calculateFilteredSoldGoodsCost } = require('./costCalculator');

/**
 * 计算详细分析数据（按客户或产品分组）
 * @param {string} startDate 开始日期
 * @param {string} endDate 结束日期
 * @param {string} customerCode 客户代号（可选）
 * @param {string} productModel 产品型号（可选）
 * @param {Function} callback 回调函数 (err, detailData)
 */
function calculateDetailAnalysis(startDate, endDate, customerCode, productModel, callback) {
  // 确定分组类型
  const groupByCustomer = !customerCode || customerCode === 'All';
  const groupByProduct = !productModel || productModel === 'All';
  
  // 如果两个都是All或都不是All，不需要详细分析
  if ((groupByCustomer && groupByProduct) || (!groupByCustomer && !groupByProduct)) {
    return callback(null, []);
  }
  
  let groupField, filterField, filterValue;
  if (groupByCustomer) {
    // 按客户分组，过滤指定产品
    groupField = 'customer_code';
    filterField = 'product_model';
    filterValue = productModel;
  } else {
    // 按产品分组，过滤指定客户
    groupField = 'product_model';
    filterField = 'customer_code';
    filterValue = customerCode;
  }
  
  // 1. 获取所有相关的出库记录
  const outboundSql = `
    SELECT 
      ${groupField} as group_key,
      product_model,
      customer_code,
      SUM(CASE WHEN unit_price >= 0 THEN quantity * unit_price ELSE 0 END) as normal_sales,
      SUM(CASE WHEN unit_price < 0 THEN ABS(quantity * unit_price) ELSE 0 END) as special_expense
    FROM outbound_records 
    WHERE date(outbound_date) BETWEEN ? AND ?
      AND ${filterField} = ?
    GROUP BY ${groupField}
    HAVING normal_sales > 0 OR special_expense > 0
  `;
  
  db.all(outboundSql, [startDate, endDate, filterValue], (err, outboundGroups) => {
    if (err) return callback(err);
    
    if (outboundGroups.length === 0) {
      return callback(null, []);
    }
    
    // 2. 获取所有产品的平均成本
    db.all(`
      SELECT 
        product_model,
        SUM(quantity * unit_price) / SUM(quantity) as avg_cost_price,
        SUM(quantity) as total_inbound_quantity
      FROM inbound_records 
      WHERE unit_price >= 0
      GROUP BY product_model
    `, [], (err, avgCostData) => {
      if (err) return callback(err);
      
      const avgCostMap = {};
      avgCostData.forEach(item => {
        avgCostMap[item.product_model] = {
          avg_cost_price: decimalCalc.fromSqlResult(item.avg_cost_price, 0, 4),
          total_inbound_quantity: decimalCalc.fromSqlResult(item.total_inbound_quantity, 0, 0)
        };
      });
      
      // 3. 计算每个分组的详细数据
      const detailPromises = outboundGroups.map(group => {
        return new Promise((resolve, reject) => {
          const groupKey = group.group_key;
          const currentCustomerCode = groupByCustomer ? groupKey : customerCode;
          const currentProductModel = groupByProduct ? groupKey : productModel;
          
          // 计算该分组的成本
          calculateFilteredSoldGoodsCost(
            startDate, 
            endDate, 
            currentCustomerCode === 'All' ? null : currentCustomerCode,
            currentProductModel === 'All' ? null : currentProductModel,
            (costErr, costAmount) => {
              if (costErr) return reject(costErr);
              
              const normalSales = decimalCalc.fromSqlResult(group.normal_sales, 0, 2);
              const specialExpense = decimalCalc.fromSqlResult(group.special_expense, 0, 2);
              const salesAmount = decimalCalc.toDbNumber(decimalCalc.subtract(normalSales, specialExpense), 2);
              const cost = decimalCalc.toDbNumber(costAmount, 2);
              const profit = decimalCalc.toDbNumber(decimalCalc.subtract(salesAmount, cost), 2);
              
              // 计算利润率
              let profitRate = 0;
              if (salesAmount > 0) {
                const rate = decimalCalc.multiply(decimalCalc.divide(profit, salesAmount), 100);
                profitRate = decimalCalc.toDbNumber(rate, 2);
              }
              
              // 只有销售额大于0才返回
              if (salesAmount > 0) {
                resolve({
                  group_key: groupKey,
                  customer_code: currentCustomerCode,
                  product_model: currentProductModel,
                  sales_amount: salesAmount,
                  cost_amount: cost,
                  profit_amount: profit,
                  profit_rate: profitRate
                });
              } else {
                resolve(null);
              }
            }
          );
        });
      });
      
      Promise.all(detailPromises)
        .then(results => {
          // 过滤掉null值（销售额为0的记录）
          const validResults = results.filter(item => item !== null);
          callback(null, validResults);
        })
        .catch(callback);
    });
  });
}

module.exports = {
  calculateDetailAnalysis
};
