import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { db } from '../db';
import { useState, useEffect } from 'react';
import { processQueue } from '../services/syncQueue'; 

export function useInventorySync(branchId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // 1. Detectar Red + Procesar Cola
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await processQueue(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['syncInventory'] });
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // 2. Leer datos locales (Igual que antes)
  const localInventory = useLiveQuery(
    () => db.inventory.where('branch_id').equals(Number(branchId)).toArray(),
    [branchId]
  );

  // 3. Sincronizar servidor -> local (Bajada de datos)
  const { isFetching: isSyncing } = useQuery({
    queryKey: ['syncInventory', branchId],
    queryFn: async () => {
      if (!isOnline) return null;
      
      console.log('☁️ Bajando inventario del servidor...');
      const { data } = await api.get(`/inventory/${branchId}`);
      
      await db.transaction('rw', db.inventory, async () => {
        // Borramos los que tienen ID numérico (vienen del servidor)
        const oldItems = await db.inventory.where('branch_id').equals(Number(branchId)).toArray();
        const idsToDelete = oldItems.filter(i => typeof i.id === 'number').map(i => i.id);
        
        await db.inventory.bulkDelete(idsToDelete);
        
        // --- CORRECCIÓN CRÍTICA AQUÍ ---
        const itemsToSave = data.map(item => ({
          // Mapeamos el ID del servidor (inventory_id) al ID que Dexie espera (id)
          id: item.inventory_id, 
          ...item,
          branch_id: Number(branchId),
          synced_at: new Date()
        }));
        // ---------------------------------
        
        await db.inventory.bulkPut(itemsToSave);
        
        console.log(`✅ Inventario local actualizado.`);
      });
      
      return data;
    },
    enabled: isOnline && !!branchId,
    refetchOnWindowFocus: false, // Menos agresivo
    staleTime: 1000 * 60,
    retry: 1,
  });

  return {
    inventory: localInventory || [],
    isOnline,
    isSyncing
  };
}