// client/src/services/syncQueue.js
import { db } from '../db';
import api from '../api/axios';

// Pequeño candado para evitar que dos llamadas procesen la cola al mismo tiempo
let processing = false;

const invalidate = (queryClient, key) => {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: [key] });
};

const replaceProductTempId = async (action, serverProduct) => {
  if (!action.tempId) return;

  // Borramos el registro temporal
  await db.inventory.where('id').equals(action.tempId).delete();

  // Bajamos el inventario actualizado para conseguir el ID real del backend
  const branchId = action.payload?.branch_id || action.payload?.branchId;
  if (!branchId) return;

  const { data: inventoryData } = await api.get(`/inventory/${branchId}`);
  const match = inventoryData.find((item) => item.sku === (serverProduct?.sku || action.payload?.sku));
  if (!match) return;

  // Guardamos el registro real con el ID correcto
  await db.inventory.put({
    ...match,
    id: match.inventory_id,
    branch_id: match.branch_id || branchId,
  });
};

const replaceUserTempId = async (action, serverUser) => {
  if (action.tempId) {
    await db.users.where('id').equals(action.tempId).delete();
  }
  // Aseguramos que el registro local tenga el ID definitivo y quite la marca temp
  await db.users.put({ ...serverUser, temp: false });
};

// La función debe recibir queryClient para invalidar correctamente
export const processQueue = async (queryClient) => {
  if (!navigator.onLine) return;
  if (processing) return;
  processing = true;

  try {
    // PRIMERO: Limpiar mutaciones inválidas (CREATE_USER sin password)
    const allMutations = await db.mutations.toArray();
    const invalidMutations = allMutations
      .filter(m => m.type === 'CREATE_USER' && !m.payload.password)
      .map(m => m.id);
    
    if (invalidMutations.length > 0) {
      console.warn(`⚠️ Eliminando ${invalidMutations.length} mutaciones CREATE_USER inválidas (sin password)`);
      await db.mutations.bulkDelete(invalidMutations);
    }

    const pendingActions = await db.mutations.orderBy('timestamp').toArray();
    if (pendingActions.length === 0) return;

    console.log(`🔄 Procesando ${pendingActions.length} cambios pendientes...`);

    for (const action of pendingActions) {
      try {
        if (action.type === 'CREATE') {
          const { data } = await api.post('/products', action.payload);
          const serverProduct = data.product || data;
          await replaceProductTempId(action, serverProduct);
          invalidate(queryClient, 'syncInventory');
        }

        else if (action.type === 'UPDATE') {
          await api.put(`/products/${action.payload.id}`, action.payload);
          invalidate(queryClient, 'syncInventory');
        }

        else if (action.type === 'DELETE') {
          await api.delete(`/products/${action.payload.id}`);
          invalidate(queryClient, 'syncInventory');
        }

        else if (action.type === 'CREATE_USER') {
          // Esta validación es redundante ahora porque ya limpiamos arriba, pero la dejamos por seguridad
          if (!action.payload.username || !action.payload.password) {
            console.warn('⚠️ CREATE_USER sin username o password (debería haber sido eliminado)');
          } else {
            const { data } = await api.post('/users', action.payload);
            await replaceUserTempId(action, data);
            invalidate(queryClient, 'syncUsers');
          }
        }

        else if (action.type === 'UPDATE_USER') {
          await api.put(`/users/${action.payload.id}`, action.payload);
          await db.users.update(action.payload.id, { ...action.payload, temp: false });
          invalidate(queryClient, 'syncUsers');
        }

        else if (action.type === 'DELETE_USER') {
          await api.delete(`/users/${action.payload.id}`);
          invalidate(queryClient, 'syncUsers');
        }

        await db.mutations.delete(action.id);

      } catch (error) {
        console.error(`❌ Error sincronizando acción ${action.type}:`, error);

        // Si el error es de red, salimos y dejamos la cola intacta para reintentar
        if (!error.response) {
          processing = false;
          return;
        }

        // Errores 4xx se descartan para no bloquear la cola
        if (error.response.status >= 400 && error.response.status < 500) {
          console.warn(`Descartando mutación ${action.type} (código ${error.response.status})`);
          await db.mutations.delete(action.id);
        }
      }
    }

    console.log('✅ Sincronización completada');
  } finally {
    processing = false;
  }
};

// Función para agregar a la cola
export const addToQueue = async (type, payload, tempId = null) => {
  await db.mutations.add({
    type,
    payload,
    tempId,
    timestamp: Date.now(),
  });
};
