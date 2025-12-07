// client/src/services/syncQueue.js
import { db } from '../db';
import api from '../api/axios';

// La función debe recibir queryClient para invalidar correctamente
export const processQueue = async (queryClient) => {
  const pendingActions = await db.mutations.orderBy('timestamp').toArray();

  if (pendingActions.length === 0) return;

  console.log(`🔄 Procesando ${pendingActions.length} cambios pendientes...`);

  for (const action of pendingActions) {
    try {
      const isUserAction = action.type.includes('USER');
      const endpoint = isUserAction ? '/users' : '/products';
      const table = isUserAction ? db.users : db.inventory;
      
      let serverResponse;

      if (action.type.includes('CREATE')) {
        // CREATE: POST y reemplazo de ID temporal
        const { data } = await api.post(endpoint, action.payload);
        serverResponse = data;
        
        if (action.tempId) {
          // Eliminamos el registro temporal de la tabla local
          await table.where('id').equals(action.tempId).delete(); //
          
          // Insertamos el registro con el ID real del servidor
          await table.put({ //
            ...serverResponse,
            // Asegurar campos clave para display
            product_name: serverResponse.name || serverResponse.product_name, // Products
            username: serverResponse.username, // Users
            id: serverResponse.id 
          });
        }
      }
      
      else if (action.type.includes('UPDATE')) {
        // UPDATE: PUT
        await api.put(`${endpoint}/${action.payload.id}`, action.payload);
      } 
      
      else if (action.type.includes('DELETE')) {
        // DELETE: DELETE
        await api.delete(`${endpoint}/${action.payload.id}`);
      }

      // Si fue exitoso, invalidamos la cache y borramos la acción
      if (isUserAction) {
          queryClient.invalidateQueries(['syncUsers']);
      } else {
          queryClient.invalidateQueries(['syncInventory']);
      }
      
      await db.mutations.delete(action.id);

    } catch (error) {
      console.error(`❌ Error sincronizando acción ${action.type}:`, error);
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
          console.warn(`Descartando mutación ${action.type} debido a error del cliente (código ${error.response.status})`);
          await db.mutations.delete(action.id); 
      }
    }
  }
  
  console.log("✅ Sincronización completada");
};

// Función para agregar a la cola
export const addToQueue = async (type, payload, tempId = null) => {
  await db.mutations.add({
    type,
    payload,
    tempId,
    timestamp: Date.now()
  });
};
