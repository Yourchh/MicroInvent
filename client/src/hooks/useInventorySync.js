import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { db } from '../db/db';

export function useInventorySync(branchId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 1. Monitor de Conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Sincronización (Servidor -> Local)
  useEffect(() => {
    if (isOnline && branchId) {
      const syncData = async () => {
        try {
          console.log("🔄 Sincronizando inventario...");
          const { data } = await api.get(`/inventory/${branchId}`);
          
          // Actualización masiva eficiente en Dexie
          await db.transaction('rw', db.inventory, async () => {
            // Opcional: Limpiar inventario viejo de esta sucursal
            // await db.inventory.where({ branch_id: branchId }).delete(); 
            
            // Guardar nuevos
            await db.inventory.bulkPut(data);
          });
          console.log("✅ Inventario sincronizado");
        } catch (error) {
          console.error("Error sincronizando:", error);
        }
      };
      syncData();
    }
  }, [isOnline, branchId]);

  // 3. Lectura Reactiva (Local -> UI)
  // Esto devuelve los datos desde Dexie. Si Dexie cambia (por sync), esto se actualiza solo.
  const localInventory = useLiveQuery(
    () => db.inventory.where({ branch_id: branchId }).toArray(),
    [branchId]
  );

  return { 
    inventory: localInventory || [], 
    isOnline 
  };
}