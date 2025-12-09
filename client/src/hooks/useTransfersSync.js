import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { db } from '../db';
import { useState, useEffect, useRef } from 'react';
import { processQueue } from '../services/syncQueue';

export function useTransfersSync(branchId) {
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
      await queryClient.invalidateQueries({ queryKey: ['syncTransfers', branchId] });
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
  const localTransfers = useLiveQuery(
    () => db.transfers?.toArray(),
    []
  );

  // 3. Sincronizar servidor -> local
  const { isFetching: isSyncing } = useQuery({
    queryKey: ['syncTransfers', branchId],
    queryFn: async () => {
      if (!isOnline) return null;

      try {
        const response = await api.get('/transfers');
        const transfers = response.data?.transfers || [];

        // Guardar en IndexedDB
        if (db.transfers) {
          await db.transfers.bulkPut(
            transfers.map(t => ({
              ...t,
              _synced: true
            }))
          );
        }

        return transfers;
      } catch (error) {
        console.error('Error sincronizando transferencias:', error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: isOnline,
  });

  return {
    transfers: localTransfers || [],
    isOnline,
    isSyncing,
  };
}
