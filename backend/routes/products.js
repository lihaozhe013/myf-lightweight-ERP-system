const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取产品列表
router.get('/', (req, res) => {
  const { category, product_model, code } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  let params = [];
  if (category) {
    sql += ' AND category LIKE ?';
    params.push(`%${category}%`);
  }
  if (product_model) {
    sql += ' AND product_model LIKE ?';
    params.push(`%${product_model}%`);
  }
  if (code) {
    sql += ' AND code LIKE ?';
    params.push(`%${code}%`);
  }
  sql += ' ORDER BY code';
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// 新增产品
router.post('/', (req, res) => {
  const { code, category, product_model, remark } = req.body;
  const sql = `
    INSERT INTO products (code, category, product_model, remark)
    VALUES (?, ?, ?, ?)
  `;
  db.run(sql, [code, category, product_model, remark], function(err) {
    if (err) {
      if (db.isConstraintError(err)) {
        res.status(400).json({ error: '产品代号已存在' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ code, message: '产品创建成功' });
  });
});

// 修改产品（按code主键）
router.put('/:code', (req, res) => {
  const { code } = req.params;
  const { category, product_model, remark } = req.body;
  const sql = `UPDATE products SET category=?, product_model=?, remark=? WHERE code=?`;
  db.run(sql, [category, product_model, remark, code], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '产品不存在' });
      return;
    }
    res.json({ message: '产品更新成功' });
  });
});

// 删除产品（按code主键）
router.delete('/:code', (req, res) => {
  const { code } = req.params;
  db.run('DELETE FROM products WHERE code = ?', [code], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '产品不存在' });
      return;
    }
    res.json({ message: '产品删除成功' });
  });
});

// 批量/单条设置代号-型号强绑定
router.post('/bindings', (req, res) => {
  const bindings = Array.isArray(req.body) ? req.body : [req.body];
  // bindings: [{code, product_model}]
  if (!bindings.length) return res.status(400).json({ error: '无绑定数据' });
  const codes = new Set();
  const models = new Set();
  for (const b of bindings) {
    if (!b.code || !b.product_model) {
      return res.status(400).json({ error: '代号和型号均不能为空' });
    }
    if (codes.has(b.code) || models.has(b.product_model)) {
      return res.status(400).json({ error: '批量数据内有重复' });
    }
    codes.add(b.code); models.add(b.product_model);
  }
  // 检查数据库冲突
  const placeholders = bindings.map(() => '?').join(',');
  const checkSql = `SELECT code, product_model FROM products WHERE code IN (${placeholders}) OR product_model IN (${placeholders})`;
  const params = [...bindings.map(b=>b.code), ...bindings.map(b=>b.product_model)];
  db.all(checkSql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows && rows.length) {
      return res.status(400).json({ error: '与现有数据冲突', conflicts: rows });
    }
    // 插入/更新（使用统一的 upsert 方法）
    (async () => {
      try {
        await db.upsertProductBindings(bindings);
        res.json({ message: '绑定成功' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    })();
  });
});

module.exports = router;