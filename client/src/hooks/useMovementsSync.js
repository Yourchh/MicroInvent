import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { db } from '../db';
import { useState, useEffect, useRef } from 'react';
import { processQueue } from '../services/syncQueue';

export function useMovementsSync(branchId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wasOfflineRef = useRef(navigator.onLine === false);
  const queryClient = useQueryClient();

  // 1. Detectar Red + Procesar Cola
  useEffect(() => {
    const handleOnline = async () => {
      if (wasOfflineRef.current) {
        await processQueue(queryClient);
      }
      setIsOnline(true);
      wasOfflineRef.current = false;
      await queryClient.invalidateQueries({ queryKey: ['syncMovements', branchId] });
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, branchId]);

  // 2. Leer datos locales
  const localMovements = useLiveQuery(
    () => db.movements?.where('branch_id').equals(Number(branchId)).toArray(),
    [branchId]
  );

  // 3. Sincronizar servidor -> local
  const { isFetching: isSyncing } = useQuery({
    queryKey: ['syncMovements', branchId],
    queryFn: async () => {
      if (!isOnline) return null;

      try {
        console.log('☁️ Sincronizando movimientos con la nube...');
        const response = await api.get('/movements');
        const movements = response.data?.movements || [];

        // Sincronización No Destructiva
        await db.transaction('rw', db.movements, async () => {
          // 1. Obtener IDs numéricos (ya sincronizados)
          const allMovements = await db.movements.toArray();
          const syncedIdsToDelete = allMovements
            .filter(m => typeof m.id === 'number')
            .map(m => m.id);
          
          // 2. Eliminar solo registros sincronizados (preserva temporales)
          if (syncedIdsToDelete.length > 0) {
            await db.movements.bulkDelete(syncedIdsToDelete);
          }

          // 3. Insertar registros frescos del servidor
          await db.movements.bulkPut(
            movements.map(m => ({
              ...m,
              branch_id: Number(branchId),
              temp: false
            }))
          );
        });

        console.log('✅ Lista de movimientos local actualizada');
        return movements;
      } catch (error) {
        console.error('Error sincronizando movimientos:', error);
        return null;
      }
    },
    enabled: isOnline,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
    retry: 1,
  });

  return {
    movements: localMovements || [],
    isOnline,
    isSyncing,
  };
}
