// 应收数据查询模块
const db = require('../../../db');
const decimalCalc = require('../../../utils/decimalCalculator');

class ReceivableQueries {
  /**
   * 获取应收账款汇总
   */
  getReceivableSummary(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          o.customer_code,
          o.customer_short_name,
          o.customer_full_name,
          COALESCE(SUM(o.total_price), 0) as total_sales,
          COALESCE(SUM(p.amount), 0) as total_payments,
          COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(p.amount), 0) as balance
        FROM outbound_records o
        LEFT JOIN receivable_payments p ON o.customer_code = p.customer_code
      `;
      
      const conditions = ['1=1'];
      const params = [];
      
      if (filters.outboundFrom) {
        conditions.push('o.outbound_date >= ?');
        params.push(filters.outboundFrom);
      }
      if (filters.outboundTo) {
        conditions.push('o.outbound_date <= ?');
        params.push(filters.outboundTo);
      }
      if (filters.paymentFrom) {
        conditions.push('(p.pay_date IS NULL OR p.pay_date >= ?)');
        params.push(filters.paymentFrom);
      }
      if (filters.paymentTo) {
        conditions.push('(p.pay_date IS NULL OR p.pay_date <= ?)');
        params.push(filters.paymentTo);
      }
      
      sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY o.customer_code, o.customer_short_name, o.customer_full_name';
      sql += ' ORDER BY balance DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 使用 decimal.js 重新计算精确的余额
          const processedRows = (rows || []).map(row => {
            const totalSales = decimalCalc.fromSqlResult(row.total_sales, 0);
            const totalPayments = decimalCalc.fromSqlResult(row.total_payments, 0);
            const balance = decimalCalc.calculateBalance(totalSales, totalPayments);
            
            return {
              ...row,
              total_sales: totalSales,
              total_payments: totalPayments,
              balance: balance
            };
          });
          resolve(processedRows);
        }
      });
    });
  }

  /**
   * 获取应收明细
   */
  getReceivableDetails(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id as record_id, customer_code, customer_short_name, 
               product_model, total_price, outbound_date, remark
        FROM outbound_records 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.outboundFrom) {
        sql += ' AND outbound_date >= ?';
        params.push(filters.outboundFrom);
      }
      if (filters.outboundTo) {
        sql += ' AND outbound_date <= ?';
        params.push(filters.outboundTo);
      }
      
      sql += ' ORDER BY outbound_date DESC, id DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 获取回款记录
   */
  getReceivablePayments(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, customer_code, amount, pay_date, pay_method, remark
        FROM receivable_payments 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.paymentFrom) {
        sql += ' AND pay_date >= ?';
        params.push(filters.paymentFrom);
      }
      if (filters.paymentTo) {
        sql += ' AND pay_date <= ?';
        params.push(filters.paymentTo);
      }
      
      sql += ' ORDER BY pay_date DESC, id DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = ReceivableQueries;
