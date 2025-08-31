const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取客户/供应商列表
router.get('/', (req, res) => {
  const { type, short_name, full_name, code } = req.query;
  
  let sql = 'SELECT * FROM partners WHERE 1=1';
  let params = [];
  
  if (type !== undefined) {
    sql += ' AND type = ?';
    params.push(parseInt(type));
  }
  if (short_name) {
    sql += ' AND short_name LIKE ?';
    params.push(`%${short_name}%`);
  }
  if (full_name) {
    sql += ' AND full_name LIKE ?';
    params.push(`%${full_name}%`);
  }
  if (code) {
    sql += ' AND code LIKE ?';
    params.push(`%${code}%`);
  }
  sql += ' ORDER BY short_name';
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// 新增客户/供应商
router.post('/', (req, res) => {
  const { code, short_name, full_name, address, contact_person, contact_phone, type } = req.body;
  const sql = `
    INSERT INTO partners (code, short_name, full_name, address, contact_person, contact_phone, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [code, short_name, full_name, address, contact_person, contact_phone, type], function(err) {
    if (err) {
      if (db.isConstraintError(err)) {
        res.status(400).json({ error: '客户/供应商代号或简称已存在' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ short_name, message: '客户/供应商创建成功' });
  });
});

// 修改客户/供应商
router.put('/:short_name', (req, res) => {
  const { short_name } = req.params;
  const { code, full_name, address, contact_person, contact_phone, type } = req.body;
  const sql = `
    UPDATE partners SET code=?, full_name=?, address=?, contact_person=?, contact_phone=?, type=?
    WHERE short_name=?
  `;
  db.run(sql, [code, full_name, address, contact_person, contact_phone, type, short_name], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '客户/供应商不存在' });
      return;
    }
    res.json({ message: '客户/供应商更新成功' });
  });
});

// 删除客户/供应商
router.delete('/:short_name', (req, res) => {
  const { short_name } = req.params;
  
  db.run('DELETE FROM partners WHERE short_name = ?', [short_name], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: '客户/供应商不存在' });
      return;
    }
    
    res.json({ message: '客户/供应商删除成功' });
  });
});

// 批量/单条设置代号-简称-全称强绑定
router.post('/bindings', (req, res) => {
  const bindings = Array.isArray(req.body) ? req.body : [req.body];
  // bindings: [{code, short_name, full_name}]
  if (!bindings.length) return res.status(400).json({ error: '无绑定数据' });
  // 校验唯一性和一一对应
  const codes = new Set();
  const shorts = new Set();
  const fulls = new Set();
  for (const b of bindings) {
    if (!b.code || !b.short_name || !b.full_name) {
      return res.status(400).json({ error: '三项均不能为空' });
    }
    if (codes.has(b.code) || shorts.has(b.short_name) || fulls.has(b.full_name)) {
      return res.status(400).json({ error: '批量数据内有重复' });
    }
    codes.add(b.code); shorts.add(b.short_name); fulls.add(b.full_name);
  }
  // 检查数据库冲突
  const placeholders = bindings.map(() => '?').join(',');
  const checkSql = `SELECT code, short_name, full_name FROM partners WHERE code IN (${placeholders}) OR short_name IN (${placeholders}) OR full_name IN (${placeholders})`;
  const params = [...bindings.map(b=>b.code), ...bindings.map(b=>b.short_name), ...bindings.map(b=>b.full_name)];
  db.all(checkSql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows && rows.length) {
      // 找到冲突项
      return res.status(400).json({ error: '与现有数据冲突', conflicts: rows });
    }
    // 插入/更新（使用统一的 upsert 方法）
    (async () => {
      try {
        await db.upsertPartnerBindings(bindings);
        res.json({ message: '绑定成功' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    })();
  });
});

module.exports = router;