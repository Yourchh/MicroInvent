import Dexie from 'dexie';

export const db = new Dexie('MicroInventDB');

db.version(1).stores({
  // Definimos índices para búsquedas rápidas
  products: 'id, sku, name, syncStatus', // syncStatus: 'synced', 'pending_create', 'pending_update'
  inventory: 'id, branch_id, product_id', 
  movements: '++id, type, created_at' // ++id es autoincrement local
});