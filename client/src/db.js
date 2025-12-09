// client/src/db.js
import Dexie from 'dexie';

export const db = new Dexie('MicroInventDB');

// Subimos la versión a 4 para incluir stock por sucursal
db.version(4)
  .stores({
    // Indexamos quantity/min/max para filtros y actualizaciones offline
    inventory: 'id, branch_id, sku, product_name, synced_at, quantity, min_stock, max_stock',
    branches: 'id, name',
    mutations: '++id, type, payload, tempId, timestamp',
    users: 'id, username, role, created_at'
  })
  .upgrade(async (tx) => {
    // Garantiza que registros anteriores tengan los campos de stock
    await tx.table('inventory').toCollection().modify((item) => {
      if (item.quantity === undefined) item.quantity = 0;
      if (item.min_stock === undefined) item.min_stock = item.min_stock_alert ?? 0;
      if (item.max_stock === undefined) item.max_stock = null;
    });
  });