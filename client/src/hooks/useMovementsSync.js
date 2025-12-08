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
      await queryClient.invalidateQueries({ queryKey: ['syncMovements'] });
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
  }, [queryClient]);

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
        const response = await api.get('/movements');
        const movements = response.data?.movements || [];

        // Guardar en IndexedDB
        if (db.movements) {
          await db.movements.bulkPut(
            movements.map(m => ({
              ...m,
              branch_id: branchId,
              _synced: true
            }))
          );
        }

        return movements;
      } catch (error) {
        console.error('Error sincronizando movimientos:', error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isOnline,
  });

  return {
    movements: localMovements || [],
    isOnline,
    isSyncing,
  };
}
