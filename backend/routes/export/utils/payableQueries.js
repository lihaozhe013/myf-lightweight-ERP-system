// 应付数据查询模块
const db = require('../../../db');
const decimalCalc = require('../../../utils/decimalCalculator');

class PayableQueries {
  /**
   * 获取应付账款汇总
   */
  getPayableSummary(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          i.supplier_code,
          i.supplier_short_name,
          i.supplier_full_name,
          COALESCE(SUM(i.total_price), 0) as total_purchases,
          COALESCE(SUM(p.amount), 0) as total_payments,
          COALESCE(SUM(i.total_price), 0) - COALESCE(SUM(p.amount), 0) as balance
        FROM inbound_records i
        LEFT JOIN payable_payments p ON i.supplier_code = p.supplier_code
      `;
      
      const conditions = ['1=1'];
      const params = [];
      
      if (filters.outboundFrom) {
        conditions.push('i.inbound_date >= ?');
        params.push(filters.outboundFrom);
      }
      if (filters.outboundTo) {
        conditions.push('i.inbound_date <= ?');
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
      sql += ' GROUP BY i.supplier_code, i.supplier_short_name, i.supplier_full_name';
      sql += ' ORDER BY balance DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 使用 decimal.js 重新计算精确的余额
          const processedRows = (rows || []).map(row => {
            const totalPurchases = decimalCalc.fromSqlResult(row.total_purchases, 0);
            const totalPayments = decimalCalc.fromSqlResult(row.total_payments, 0);
            const balance = decimalCalc.calculateBalance(totalPurchases, totalPayments);
            
            return {
              ...row,
              total_purchases: totalPurchases,
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
   * 获取应付明细
   */
  getPayableDetails(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id as record_id, supplier_code, supplier_short_name, 
               product_model, total_price, inbound_date, remark
        FROM inbound_records 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.outboundFrom) {
        sql += ' AND inbound_date >= ?';
        params.push(filters.outboundFrom);
      }
      if (filters.outboundTo) {
        sql += ' AND inbound_date <= ?';
        params.push(filters.outboundTo);
      }
      
      sql += ' ORDER BY inbound_date DESC, id DESC';
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 获取付款记录
   */
  getPayablePayments(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, supplier_code, amount, pay_date, pay_method, remark
        FROM payable_payments 
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

module.exports = PayableQueries;
