// 分析数据查询模块
const db = require('../../../db');

class AnalysisQueries {
  /**
   * 获取按客户分类的分析数据（高级导出）
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Promise<Array>} 返回客户分析数据数组
   */
  async getCustomerAnalysisData(startDate, endDate) {
    return new Promise((resolve, reject) => {
      // 首先获取所有客户的销售数据
      const customerSalesSql = `
        SELECT 
          p.code as customer_code,
          p.full_name as customer_name,
          o.product_model,
          SUM(o.quantity) as total_quantity,
          SUM(o.total_price) as sales_amount
        FROM outbound_records o
        LEFT JOIN partners p ON (o.customer_code = p.code OR o.customer_short_name = p.short_name)
        WHERE o.outbound_date >= ? AND o.outbound_date <= ?
        AND p.code IS NOT NULL
        AND o.unit_price >= 0
        GROUP BY p.code, p.full_name, o.product_model
        ORDER BY p.full_name, o.product_model
      `;

      db.all(customerSalesSql, [startDate, endDate], (err, salesData) => {
        if (err) return reject(err);

        if (salesData.length === 0) {
          return resolve([]);
        }

        // 获取所有产品的平均成本价格
        const avgCostSql = `
          SELECT 
            product_model,
            SUM(quantity * unit_price) / SUM(quantity) as avg_cost_price
          FROM inbound_records 
          WHERE unit_price >= 0
          GROUP BY product_model
        `;

        db.all(avgCostSql, [], (costErr, costData) => {
          if (costErr) return reject(costErr);

          // 转换为Map便于查找
          const costMap = {};
          costData.forEach(item => {
            costMap[item.product_model] = item.avg_cost_price || 0;
          });

          // 处理每个客户的数据
          const customerMap = {};
          
          salesData.forEach(row => {
            const customerCode = row.customer_code;
            const customerName = row.customer_name;
            const productModel = row.product_model;
            const salesAmount = row.sales_amount || 0;
            const quantity = row.total_quantity || 0;
            
            // 计算成本（使用平均成本价格 * 销售数量）
            const avgCostPrice = costMap[productModel] || 0;
            const costAmount = avgCostPrice * quantity;
            const profitAmount = salesAmount - costAmount;
            const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

            if (!customerMap[customerCode]) {
              customerMap[customerCode] = {
                customer_code: customerCode,
                customer_name: customerName,
                sales_amount: 0,
                cost_amount: 0,
                profit_amount: 0,
                profit_rate: 0,
                product_details: []
              };
            }

            // 累加客户总数据
            customerMap[customerCode].sales_amount += salesAmount;
            customerMap[customerCode].cost_amount += costAmount;
            customerMap[customerCode].profit_amount += profitAmount;

            // 添加产品明细
            customerMap[customerCode].product_details.push({
              product_model: productModel,
              sales_amount: salesAmount,
              cost_amount: costAmount,
              profit_amount: profitAmount,
              profit_rate: profitRate
            });
          });

          // 计算每个客户的总利润率
          Object.values(customerMap).forEach(customer => {
            customer.profit_rate = customer.sales_amount > 0 
              ? (customer.profit_amount / customer.sales_amount) * 100 
              : 0;
          });

          // 转换为数组并按销售额排序
          const result = Object.values(customerMap)
            .sort((a, b) => b.sales_amount - a.sales_amount);

          resolve(result);
        });
      });
    });
  }

  /**
   * 获取按产品分类的分析数据（高级导出）
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Promise<Array>} 返回产品分析数据数组
   */
  async getProductAnalysisData(startDate, endDate) {
    return new Promise((resolve, reject) => {
      // 首先获取所有产品的销售数据
      const productSalesSql = `
        SELECT 
          o.product_model,
          p.code as customer_code,
          p.full_name as customer_name,
          SUM(o.quantity) as total_quantity,
          SUM(o.total_price) as sales_amount
        FROM outbound_records o
        LEFT JOIN partners p ON (o.customer_code = p.code OR o.customer_short_name = p.short_name)
        WHERE o.outbound_date >= ? AND o.outbound_date <= ?
        AND p.code IS NOT NULL
        AND o.unit_price >= 0
        GROUP BY o.product_model, p.code, p.full_name
        ORDER BY o.product_model, p.full_name
      `;

      db.all(productSalesSql, [startDate, endDate], (err, salesData) => {
        if (err) return reject(err);

        if (salesData.length === 0) {
          return resolve([]);
        }

        // 获取所有产品的平均成本价格
        const avgCostSql = `
          SELECT 
            product_model,
            SUM(quantity * unit_price) / SUM(quantity) as avg_cost_price
          FROM inbound_records 
          WHERE unit_price >= 0
          GROUP BY product_model
        `;

        db.all(avgCostSql, [], (costErr, costData) => {
          if (costErr) return reject(costErr);

          // 转换为Map便于查找
          const costMap = {};
          costData.forEach(item => {
            costMap[item.product_model] = item.avg_cost_price || 0;
          });

          // 处理每个产品的数据
          const productMap = {};
          
          salesData.forEach(row => {
            const productModel = row.product_model;
            const customerCode = row.customer_code;
            const customerName = row.customer_name;
            const salesAmount = row.sales_amount || 0;
            const quantity = row.total_quantity || 0;
            
            // 计算成本（使用平均成本价格 * 销售数量）
            const avgCostPrice = costMap[productModel] || 0;
            const costAmount = avgCostPrice * quantity;
            const profitAmount = salesAmount - costAmount;
            const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

            if (!productMap[productModel]) {
              productMap[productModel] = {
                product_model: productModel,
                sales_amount: 0,
                cost_amount: 0,
                profit_amount: 0,
                profit_rate: 0,
                customer_details: []
              };
            }

            // 累加产品总数据
            productMap[productModel].sales_amount += salesAmount;
            productMap[productModel].cost_amount += costAmount;
            productMap[productModel].profit_amount += profitAmount;

            // 添加客户明细
            productMap[productModel].customer_details.push({
              customer_code: customerCode,
              customer_name: customerName,
              sales_amount: salesAmount,
              cost_amount: costAmount,
              profit_amount: profitAmount,
              profit_rate: profitRate
            });
          });

          // 计算每个产品的总利润率
          Object.values(productMap).forEach(product => {
            product.profit_rate = product.sales_amount > 0 
              ? (product.profit_amount / product.sales_amount) * 100 
              : 0;
          });

          // 转换为数组并按销售额排序
          const result = Object.values(productMap)
            .filter(product => product.product_model && product.product_model.trim() !== '')
            .sort((a, b) => b.sales_amount - a.sales_amount);

          resolve(result);
        });
      });
    });
  }
}

module.exports = AnalysisQueries;
