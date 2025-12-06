// client/src/db.js
import Dexie from 'dexie';

export const db = new Dexie('MicroInventDB');

// Subimos la versión a 3 para agregar la tabla users
db.version(3).stores({
  inventory: 'id, branch_id, sku, product_name, synced_at', 
  branches: 'id, name',
  mutations: '++id, type, payload, tempId, timestamp',
  users: 'id, username, role, created_at' // <-- NUEVO: Tabla de usuarios
});