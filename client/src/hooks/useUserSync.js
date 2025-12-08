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
    const handleOnline = async () => {
      setIsOnline(true);
      await processQueue(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['syncUsers'] });
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
        // --- CORRECCIÓN CRÍTICA: Sincronización No Destructiva ---
        // 1. Obtener todos los IDs de los registros locales que son numéricos (ya sincronizados)
        const allUsers = await db.users.toArray();
        const syncedIdsToDelete = allUsers
          .filter(u => typeof u.id === 'number')
          .map(u => u.id);
        
        // 2. Eliminar solo los registros previamente sincronizados.
        // Esto PRESERVA los registros con IDs temporales (strings) creados offline.
        await db.users.bulkDelete(syncedIdsToDelete);

        // 3. Insertar/Actualizar los registros frescos del servidor.
        await db.users.bulkPut(data); 
        // ---------------------------------------------------------
      });
      
      console.log('✅ Lista de usuarios local actualizada');
      return data;
    },
    enabled: isOnline,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60,
    retry: 1,
  });

  return {
    users: localUsers || [],
    isLoading: isSyncing,
    isOnline,
  };
}