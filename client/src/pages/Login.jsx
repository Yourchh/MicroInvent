import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Box, Users, ShieldCheck } from 'lucide-react';
import BranchSelection from '../components/BranchSelection';

export default function Login() {
  const [userType, setUserType] = useState(''); // 'employee' o 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [userData, setUserData] = useState(null);
  const [requiresBranchSelection, setRequiresBranchSelection] = useState(false);
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(username, password, userType);
    
    if (result.success) {
      // Si requiere selección de sucursal (admin/superadmin)
      if (result.requiresBranchSelection) {
        console.log('🔄 Requiere selección de sucursal');
        setTempToken(result.tempToken);
        setUserData(result.user);
        setRequiresBranchSelection(true);
      } else {
        // Login completado (empleado)
        navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  const handleBranchSelected = (data) => {
    console.log('✅ Sucursal seleccionada, redirigiendo...', data);
    // Actualizar el usuario en el contexto
    if (data?.user) {
      updateUser(data.user);
    }
    navigate('/dashboard');
  };

  const handleBackToSelection = () => {
    setUserType('');
    setUsername('');
    setPassword('');
    setError('');
  };

  // Si requiere selección de sucursal, mostrar el componente
  if (requiresBranchSelection) {
    return <BranchSelection tempToken={tempToken} userData={userData} onBranchSelected={handleBranchSelected} />;
  }

  // Paso 1: Selección de tipo de usuario
  if (!userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Box size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">MicroInvent</h1>
            <p className="text-slate-500 text-sm mt-2">Selecciona cómo deseas ingresar</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setUserType('employee')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 group"
            >
              <Users size={24} className="group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-lg">Empleado</div>
                <div className="text-xs text-blue-100">Acceso a mi sucursal asignada</div>
              </div>
            </button>

            <button
              onClick={() => setUserType('admin')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 group"
            >
              <ShieldCheck size={24} className="group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-lg">Administrador</div>
                <div className="text-xs text-purple-100">Gestión de sucursales y usuarios</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Paso 2: Formulario de credenciales
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className={`p-3 rounded-full mb-3 ${userType === 'employee' ? 'bg-blue-100' : 'bg-purple-100'}`}>
            {userType === 'employee' ? (
              <Users size={32} className="text-blue-600" />
            ) : (
              <ShieldCheck size={32} className="text-purple-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {userType === 'employee' ? 'Login Empleado' : 'Login Administrador'}
          </h1>
          <p className="text-slate-500 text-sm">Ingresa tus credenciales</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Usuario" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Ej. admin"
            required
          />
          <Input 
            label="Contraseña" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
          />
          <Button type="submit" className="w-full mt-2">
            Iniciar Sesión
          </Button>
          <button
            type="button"
            onClick={handleBackToSelection}
            className="w-full text-slate-500 hover:text-slate-700 text-sm mt-2"
          >
            ← Volver a selección
          </button>
        </form>
      </div>
    </div>
  );
}