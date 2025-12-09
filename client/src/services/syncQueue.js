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

const replaceMovementTempId = async (action, serverMovement) => {
  if (action.tempId) {
    await db.movements.where('id').equals(action.tempId).delete();
  }
  // Aseguramos que el registro local tenga el ID definitivo y quite la marca temp
  await db.movements.put({ ...serverMovement, temp: false });
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

    // Detectar y eliminar duplicados de CREATE_USER con mismo username
    const createUserActions = pendingActions.filter(a => a.type === 'CREATE_USER');
    const seenUsernames = new Set();
    const duplicateIds = [];
    
    for (const action of createUserActions) {
      if (seenUsernames.has(action.payload.username)) {
        console.warn('⚠️ Duplicado detectado para usuario:', action.payload.username);
        duplicateIds.push(action.id);
      } else {
        seenUsernames.add(action.payload.username);
      }
    }
    
    if (duplicateIds.length > 0) {
      console.log(`🗑️ Eliminando ${duplicateIds.length} mutaciones duplicadas`);
      await db.mutations.bulkDelete(duplicateIds);
      // Recargar las mutaciones después de eliminar duplicados
      const updatedActions = await db.mutations.orderBy('timestamp').toArray();
      return processQueue(queryClient, updatedActions);
    }

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
            // Remover el ID temporal antes de enviar al servidor
            // eslint-disable-next-line no-unused-vars
            const { id, temp, created_at, ...payloadWithoutId } = action.payload;
            console.log('📤 Enviando CREATE_USER al servidor:', payloadWithoutId);
            
            try {
              const { data } = await api.post('/users', payloadWithoutId);
              console.log('✅ Usuario creado en servidor:', data);
              await replaceUserTempId(action, data);
              invalidate(queryClient, 'syncUsers');
            } catch (err) {
              const errorMsg = err.response?.data?.message || err.message;
              
              // Si es error 400 (validación), eliminamos la mutación
              if (err.response?.status === 400) {
                console.warn(`⚠️ Error de validación para usuario ${payloadWithoutId.username}: ${errorMsg}`);
                console.warn('Eliminando de la cola de sincronización');
                // Eliminar el usuario temporal de IndexedDB
                if (action.tempId) {
                  await db.users.delete(action.tempId);
                }
              } else {
                throw err; // Re-lanzar otros errores para reintentar
              }
            }
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

        else if (action.type === 'CREATE_MOVEMENT') {
          const { data } = await api.post('/movements', action.payload);
          const serverMovement = data.movement || data;
          await replaceMovementTempId(action, serverMovement);
          invalidate(queryClient, 'syncMovements');
        }

        else if (action.type === 'UPDATE_MOVEMENT') {
          await api.put(`/movements/${action.payload.id}`, action.payload);
          await db.movements.update(action.payload.id, { ...action.payload, temp: false });
          invalidate(queryClient, 'syncMovements');
        }

        else if (action.type === 'DELETE_MOVEMENT') {
          await api.delete(`/movements/${action.payload.id}`);
          invalidate(queryClient, 'syncMovements');
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
