// Portable schema creation using Knex for SQLite/PostgreSQL/MySQL
const db = require('../db');

async function ensureBaseSchema() {
  const knex = db.knex;

  // helpers
  async function ensureTable(name, builder) {
    const exists = await knex.schema.hasTable(name);
    if (!exists) {
      await knex.schema.createTable(name, builder);
    }
  }

  // inbound_records
  await ensureTable('inbound_records', (t) => {
    if (db.client === 'sqlite3') t.increments('id'); else t.increments('id');
    t.string('supplier_code');
    t.string('supplier_short_name');
    t.string('supplier_full_name');
    t.string('product_code');
    t.string('product_model');
    t.integer('quantity');
    t.decimal('unit_price', 18, 6);
    t.decimal('total_price', 18, 2);
    t.string('inbound_date');
    t.string('invoice_date');
    t.string('invoice_number');
    t.string('invoice_image_url');
    t.string('order_number');
    t.string('remark');
  });

  // outbound_records
  await ensureTable('outbound_records', (t) => {
    t.increments('id');
    t.string('customer_code');
    t.string('customer_short_name');
    t.string('customer_full_name');
    t.string('product_code');
    t.string('product_model');
    t.integer('quantity');
    t.decimal('unit_price', 18, 6);
    t.decimal('total_price', 18, 2);
    t.string('outbound_date');
    t.string('invoice_date');
    t.string('invoice_number');
    t.string('invoice_image_url');
    t.string('order_number');
    t.string('remark');
  });

  // partners
  await ensureTable('partners', (t) => {
    t.string('code').unique();
    t.string('short_name').primary();
    t.string('full_name');
    t.string('address');
    t.string('contact_person');
    t.string('contact_phone');
    t.integer('type');
  });

  // products
  await ensureTable('products', (t) => {
    t.string('code').unique();
    t.string('category');
    t.string('product_model');
    t.string('remark');
  });

  // product_prices
  await ensureTable('product_prices', (t) => {
    t.increments('id');
    t.string('partner_short_name');
    t.string('product_model');
    t.string('effective_date');
    t.decimal('unit_price', 18, 6);
  });

  // receivable_payments
  await ensureTable('receivable_payments', (t) => {
    t.increments('id');
    t.string('customer_code');
    t.decimal('amount', 18, 2);
    t.string('pay_date');
    t.string('pay_method');
    t.string('remark');
  });

  // payable_payments
  await ensureTable('payable_payments', (t) => {
    t.increments('id');
    t.string('supplier_code');
    t.decimal('amount', 18, 2);
    t.string('pay_date');
    t.string('pay_method');
    t.string('remark');
  });
}

async function postSchemaAdjustments() {
  const knex = db.knex;
  // Fill total_price if null
  // Note: use COALESCE for cross-db
  if (await knex.schema.hasTable('inbound_records')) {
    await knex('inbound_records')
      .whereNull('total_price')
      .update({ total_price: knex.raw('ROUND(COALESCE(quantity,0) * COALESCE(unit_price,0), 2)') })
      .catch(() => {});
  }
  if (await knex.schema.hasTable('outbound_records')) {
    await knex('outbound_records')
      .whereNull('total_price')
      .update({ total_price: knex.raw('ROUND(COALESCE(quantity,0) * COALESCE(unit_price,0), 2)') })
      .catch(() => {});
  }
}

async function ensureAllTablesAndColumnsPortable() {
  await ensureBaseSchema();
  await postSchemaAdjustments();
}

module.exports = {
  ensureAllTablesAndColumnsPortable,
};
