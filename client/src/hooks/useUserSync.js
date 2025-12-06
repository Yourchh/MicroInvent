// client/src/hooks/useUserSync.js
import { useLiveQuery } from 'dexie-react-hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { db } from '../db';
import { useState, useEffect } from 'react';
import { processQueue } from '../services/syncQueue'; 

export function useUserSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // 1. Detectar Red + Procesar Cola
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Procesar cola al volver la red
      processQueue(queryClient).then(() => {
        // Invalida la query de sync para forzar una bajada de datos frescos
        queryClient.invalidateQueries(['syncUsers']); 
      });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
        // Llama a processQueue si la app ya carga con internet (para pendientes)
        processQueue(queryClient);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // 2. Leer datos locales (La fuente de verdad)
  const localUsers = useLiveQuery(
    () => db.users.toArray(),
    []
  );

  // 3. Sync Servidor -> Local (Bajada de datos)
  const { isFetching: isSyncing } = useQuery({
    queryKey: ['syncUsers'],
    queryFn: async () => {
      if (!isOnline) return null;
      
      console.log('☁️ Sincronizando usuarios con la nube...');
      const { data } = await api.get('/users'); 
      
      await db.transaction('rw', db.users, async () => {
        await db.users.clear(); 
        await db.users.bulkPut(data); 
      });
      
      console.log('✅ Lista de usuarios local actualizada');
      return data;
    },
    enabled: isOnline,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
  });

  return {
    users: localUsers || [],
    isLoading: isSyncing,
    isOnline,
  };
}