// 多数据库兼容层：基于 Knex 适配 SQLite / PostgreSQL / MySQL
const path = require('path');
const fs = require('fs');
const knexFactory = require('knex');

// 读取配置
function loadAppConfig() {
  const cfgPath = path.resolve(__dirname, '../data/appConfig.json');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  return JSON.parse(raw);
}

const config = loadAppConfig();

function buildKnexConfig(appConfig) {
  const dbCfg = (appConfig && appConfig.database) || { type: 'sqlite' };
  const type = (dbCfg.type || 'sqlite').toLowerCase();

  if (type === 'postgres' || type === 'postgresql') {
    const pg = dbCfg.postgres || {};
    return {
      client: 'pg',
      connection: pg.connectionString || {
        host: pg.host || '127.0.0.1',
        port: pg.port || 5432,
        user: pg.user || 'postgres',
        password: pg.password || '',
        database: pg.database || 'postgres'
      },
      pool: { min: 0, max: 10 }
    };
  }

  if (type === 'mysql' || type === 'mariadb') {
    const my = dbCfg.mysql || {};
    return {
      client: 'mysql2',
      connection: my.connectionString || {
        host: my.host || '127.0.0.1',
        port: my.port || 3306,
        user: my.user || 'root',
        password: my.password || '',
        database: my.database || 'test',
        charset: my.charset || 'utf8mb4'
      },
      pool: { min: 0, max: 10 }
    };
  }

  // 默认 SQLite
  const sqlite = dbCfg.sqlite || {};
  const filename = path.resolve(__dirname, '..', sqlite.filename || 'data/data.db');
  return {
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 } // sqlite 单连接
  };
}

const knex = knexFactory(buildKnexConfig(config));

// 统一适配：提供与 sqlite3 相似的 API：all/get/run
function normalizeRowsFromRaw(result) {
  // pg: result.rows
  if (result && Array.isArray(result.rows)) return result.rows;
  // mysql2: [rows, fields]
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  // sqlite3 via knex: result may be { rows: [...] } or just an array
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    // attempt to find array-like property
    for (const k of ['rows', 'recordset', 'result', '0']) {
      if (Array.isArray(result[k])) return result[k];
    }
  }
  return [];
}

function sqlType(sql) {
  if (!sql || typeof sql !== 'string') return 'other';
  const head = sql.trim().split(/\s+/)[0].toLowerCase();
  if (head === 'insert') return 'insert';
  if (head === 'update') return 'update';
  if (head === 'delete') return 'delete';
  return 'other';
}

const adapter = {
  client: knex.client.config.client,

  // 查询多行
  all(sql, params, cb) {
    knex.raw(sql, params).then((res) => {
      const rows = normalizeRowsFromRaw(res);
      cb && cb(null, rows);
    }).catch((err) => cb && cb(err));
  },

  // 查询单行
  get(sql, params, cb) {
    knex.raw(sql, params).then((res) => {
      const rows = normalizeRowsFromRaw(res);
      cb && cb(null, rows[0] || null);
    }).catch((err) => cb && cb(err));
  },

  // 执行写操作（返回 lastID/changes 的兼容字段）
  run(sql, params, cb) {
    const client = knex.client.config.client;
    const kind = sqlType(sql);
    knex.raw(sql, params).then(async (res) => {
      const ctx = {};
      try {
        if (client === 'sqlite3') {
          // 获取 changes() 和 last_insert_rowid() 保持与 sqlite3 API 接近
          const changesRes = await knex.raw('SELECT changes() AS changes');
          const changesRows = normalizeRowsFromRaw(changesRes);
          ctx.changes = changesRows && changesRows[0] ? changesRows[0].changes : undefined;
          if (kind === 'insert') {
            const lastIdRes = await knex.raw('SELECT last_insert_rowid() AS id');
            const lastIdRows = normalizeRowsFromRaw(lastIdRes);
            ctx.lastID = lastIdRows && lastIdRows[0] ? lastIdRows[0].id : undefined;
          }
        } else if (client === 'pg') {
          // rowCount 可用；lastID 需 SQL 带 RETURNING
          ctx.changes = res && res.rowCount !== undefined ? res.rowCount : undefined;
          ctx.lastID = undefined;
        } else {
          // mysql2: [ResultSetHeader, fields]
          if (Array.isArray(res) && res[0] && typeof res[0].affectedRows !== 'undefined') {
            ctx.changes = res[0].affectedRows;
            ctx.lastID = res[0].insertId;
          }
        }
      } catch (_) {}
      cb && cb.call(ctx, null);
    }).catch((err) => cb && cb(err));
  },

  // 通用 UPSERT 方法（跨数据库兼容）
  async upsert(tableName, data, conflictColumns, updateColumns) {
    const client = knex.client.config.client;
    if (!data || (Array.isArray(data) && !data.length)) return;
    
    const rows = Array.isArray(data) ? data : [data];
    
    if (client === 'pg') {
      return await knex(tableName)
        .insert(rows)
        .onConflict(conflictColumns)
        .merge(updateColumns.reduce((acc, col) => {
          acc[col] = knex.raw(`EXCLUDED.${col}`);
          return acc;
        }, {}));
    } else if (client === 'mysql2') {
      return await knex(tableName)
        .insert(rows)
        .onDuplicateUpdate(updateColumns);
    } else {
      // sqlite3: 使用事务批量 INSERT OR REPLACE
      const trx = await knex.transaction();
      try {
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map(() => '?').join(',');
          await trx.raw(
            `INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`,
            values
          );
        }
        await trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    }
  },

  // 批量绑定：产品 code <-> model 强绑定（使用通用 upsert）
  async upsertProductBindings(bindings) {
    if (!bindings || !bindings.length) return;
    const rows = bindings.map(b => ({ code: b.code, product_model: b.product_model }));
    return await this.upsert('products', rows, ['code'], ['product_model']);
  },

  // 批量绑定：合作伙伴 code <-> short_name <-> full_name 强绑定
  async upsertPartnerBindings(bindings) {
    if (!bindings || !bindings.length) return;
    const rows = bindings.map(b => ({ code: b.code, short_name: b.short_name, full_name: b.full_name }));
    return await this.upsert('partners', rows, ['code'], ['short_name', 'full_name']);
  },

  // 通用插入方法（返回插入的ID）
  async insert(tableName, data) {
    const client = knex.client.config.client;
    
    if (client === 'pg') {
      const result = await knex(tableName).insert(data).returning('id');
      return result[0]?.id;
    } else if (client === 'mysql2') {
      const result = await knex(tableName).insert(data);
      return result[0]; // insertId
    } else {
      // sqlite3
      await knex(tableName).insert(data);
      const result = await knex.raw('SELECT last_insert_rowid() AS id');
      const rows = normalizeRowsFromRaw(result);
      return rows[0]?.id;
    }
  },

  // 通用更新方法（返回影响的行数）
  async update(tableName, data, where) {
    const query = knex(tableName).update(data);
    
    // 添加 WHERE 条件
    if (where && typeof where === 'object') {
      Object.entries(where).forEach(([key, value]) => {
        query.where(key, value);
      });
    }
    
    const result = await query;
    
    // 跨数据库返回影响的行数
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'sqlite3') {
      return result; // 直接返回影响的行数
    } else {
      // mysql2 返回 [affectedRows, ...]
      return Array.isArray(result) ? result[0] : result;
    }
  },

  // 通用删除方法（返回影响的行数）
  async delete(tableName, where) {
    const query = knex(tableName).del();
    
    // 添加 WHERE 条件
    if (where && typeof where === 'object') {
      Object.entries(where).forEach(([key, value]) => {
        query.where(key, value);
      });
    }
    
    const result = await query;
    
    // 跨数据库返回影响的行数
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'sqlite3') {
      return result;
    } else {
      return Array.isArray(result) ? result[0] : result;
    }
  },

  // 跨数据库日期函数
  dateFormat(columnName) {
    const client = knex.client.config.client;
    if (client === 'pg') {
      return knex.raw(`DATE(${columnName})`);
    } else if (client === 'mysql2') {
      return knex.raw(`DATE(${columnName})`);
    } else {
      // sqlite3
      return knex.raw(`date(${columnName})`);
    }
  },

  // 跨数据库日期比较（生成 SQL 片段）
  dateBetween(columnName, startDate, endDate) {
    const client = knex.client.config.client;
    if (client === 'pg') {
      return `DATE(${columnName}) BETWEEN ? AND ?`;
    } else if (client === 'mysql2') {
      return `DATE(${columnName}) BETWEEN ? AND ?`;
    } else {
      // sqlite3
      return `date(${columnName}) BETWEEN ? AND ?`;
    }
  },

  // 跨数据库错误处理
  isConstraintError(error) {
    if (!error) return false;
    const client = knex.client.config.client;
    
    if (client === 'pg') {
      // PostgreSQL 约束错误
      return error.code === '23505' || // unique_violation
             error.code === '23503' || // foreign_key_violation
             error.code === '23502';   // not_null_violation
    } else if (client === 'mysql2') {
      // MySQL 约束错误
      return error.code === 'ER_DUP_ENTRY' || 
             error.code === 'ER_NO_REFERENCED_ROW_2' ||
             error.errno === 1062 || // Duplicate entry
             error.errno === 1452;   // Foreign key constraint fails
    } else {
      // SQLite 约束错误
      return error.code === 'SQLITE_CONSTRAINT' ||
             error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
             error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY';
    }
  },

  // 获取约束错误的友好消息
  getConstraintErrorMessage(error) {
    if (!this.isConstraintError(error)) return error.message;
    
    const client = knex.client.config.client;
    const message = error.message || '';
    
    if (client === 'pg') {
      if (error.code === '23505') return '数据已存在，违反唯一性约束';
      if (error.code === '23503') return '违反外键约束';
      if (error.code === '23502') return '必填字段不能为空';
    } else if (client === 'mysql2') {
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        return '数据已存在，违反唯一性约束';
      }
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
        return '违反外键约束';
      }
    } else {
      // SQLite
      if (message.includes('UNIQUE constraint failed')) {
        return '数据已存在，违反唯一性约束';
      }
      if (message.includes('FOREIGN KEY constraint failed')) {
        return '违反外键约束';
      }
    }
    
    return message;
  },

  // 跨数据库日期比较 - 小于
  dateLessThan(columnName) {
    const client = knex.client.config.client;
    if (client === 'pg') {
      return `DATE(${columnName}) < ?`;
    } else if (client === 'mysql2') {
      return `DATE(${columnName}) < ?`;
    } else {
      // sqlite3
      return `date(${columnName}) < ?`;
    }
  },

  // 跨数据库日期比较 - 大于等于
  dateGreaterEqual(columnName) {
    const client = knex.client.config.client;
    if (client === 'pg') {
      return `DATE(${columnName}) >= ?`;
    } else if (client === 'mysql2') {
      return `DATE(${columnName}) >= ?`;
    } else {
      // sqlite3
      return `date(${columnName}) >= ?`;
    }
  },

  // 封装常见的 INSERT + 返回 ID 操作
  insertAndGetId(sql, params, callback) {
    this.run(sql, params, function(err) {
      if (err) return callback && callback(err);
      callback && callback.call(this, null);
    });
  },

  // 封装常见的 UPDATE/DELETE + 检查 changes 操作
  runAndCheckChanges(sql, params, callback) {
    this.run(sql, params, function(err) {
      if (err) return callback && callback(err);
      callback && callback.call(this, null);
    });
  },

  // 暴露 knex 以便高级用法/迁移
  knex,
};

module.exports = adapter;
