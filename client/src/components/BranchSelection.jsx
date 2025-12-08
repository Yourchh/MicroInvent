import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { MapPin, Lock, AlertCircle, Loader } from 'lucide-react';

export default function BranchSelection({ tempToken, onBranchSelected }) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar sucursales públicamente
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches-public'],
    queryFn: async () => {
      const response = await api.get('/branches/public');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Mutación para seleccionar sucursal
  const selectMutation = useMutation({
    mutationFn: async () => {
      // Usar tempToken en el header
      const config = {
        headers: {
          Authorization: `Bearer ${tempToken}`
        }
      };
      
      const response = await api.post(
        '/auth/select-branch',
        {
          branch_id: Number(selectedBranch),
          adminUsername,
          adminPassword
        },
        config
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Sucursal seleccionada:', data);
      setErrorMsg(''); // Limpiar error
      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Notificar al componente padre
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
      // Limpiar contraseña para reintentar
      setAdminPassword('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!selectedBranch) {
      setErrorMsg('Debe seleccionar una sucursal');
      return;
    }
    
    if (!adminUsername || !adminPassword) {
      setErrorMsg('Debe ingesar credenciales del administrador');
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
            <h1 className="text-2xl font-bold text-white">Seleccionar Sucursal</h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">Elige dónde trabajarás hoy</p>
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
              Sucursal
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setErrorMsg(''); // Limpiar error al cambiar sucursal
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

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500 font-medium">
                Verificación Admin
              </span>
            </div>
          </div>

          {/* Admin Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario Admin
            </label>
            <input
              type="text"
              required
              placeholder="Usuario del administrador"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña Admin
            </label>
            <input
              type="password"
              required
              placeholder="Contraseña del administrador"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-start gap-2">
            <Lock size={16} className="flex-shrink-0 mt-0.5" />
            <p>Por seguridad, necesitamos verificar con un administrador autorizado.</p>
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
