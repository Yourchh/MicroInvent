import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { MapPin, AlertCircle, Loader } from 'lucide-react';

export default function BranchSelection({ tempToken, userData, onBranchSelected }) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Determinar si es superadmin o admin
  const isSuperAdmin = userData?.role === 'superadmin';
  const assignedBranchId = userData?.assigned_branch_id;

  // Cargar sucursales públicamente
  const { data: allBranches = [], isLoading } = useQuery({
    queryKey: ['branches-public'],
    queryFn: async () => {
      const response = await api.get('/branches/public');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Filtrar sucursales según el rol
  const branches = isSuperAdmin 
    ? allBranches 
    : allBranches.filter(b => b.id === assignedBranchId);

  // Mutación para seleccionar sucursal
  const selectMutation = useMutation({
    mutationFn: async () => {
      const config = {
        headers: {
          Authorization: `Bearer ${tempToken}`
        }
      };
      
      const response = await api.post(
        '/auth/select-branch',
        { branch_id: Number(selectedBranch) },
        config
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Sucursal seleccionada:', data);
      setErrorMsg('');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onBranchSelected(data);
    },
    onError: (err) => {
      console.error('❌ Error al seleccionar sucursal:', err);
      let msg = 'Error al seleccionar sucursal';
      
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      
      setErrorMsg(msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!selectedBranch) {
      setErrorMsg('Debe seleccionar una sucursal');
      return;
    }
    
    selectMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Seleccionar Sucursal</h1>
              <p className="text-blue-100 text-sm mt-0.5">
                {isSuperAdmin ? 'Puedes acceder a todas las sucursales' : 'Selecciona tu sucursal asignada'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border-2 border-red-200 flex items-start gap-3 animate-pulse">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">Error de Validación</p>
                <p className="text-sm">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Seleccionar Sucursal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sucursal {isSuperAdmin && <span className="text-blue-600 ml-1">(SuperAdmin - Todas)</span>}
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Selecciona una sucursal</option>
              {isLoading ? (
                <option disabled>Cargando...</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={selectMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {selectMutation.isPending ? (
              <>
                <Loader size={18} className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <MapPin size={18} />
                Confirmar Sucursal
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
