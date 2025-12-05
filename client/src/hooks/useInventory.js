import { useQuery } from '@tanstack/react-query';
import client from '../api/axios';
import { useAuth } from '../context/AuthContext';

export const useInventory = () => {
  const { user } = useAuth(); // Necesitamos saber el ID de sucursal del usuario
  
  // Por defecto usaremos la sucursal del usuario, o la 1 si no tiene asignada
  const branchId = user?.branch_id || 1;

  const getInventory = async () => {
    const { data } = await client.get(`/inventory/${branchId}`);
    return data;
  };

  // useQuery maneja la magia: caché, reintentos, loading, error
  return useQuery({
    queryKey: ['inventory', branchId], // Identificador único de esta consulta
    queryFn: getInventory,
    staleTime: 1000 * 60 * 5, // Considerar datos frescos por 5 minutos
  });
};