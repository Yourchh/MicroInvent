import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Box } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-surface p-8 rounded-2xl shadow-lg w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/10 p-3 rounded-full mb-3">
            <Box size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">MicroInvent</h1>
          <p className="text-slate-500 text-sm">Ingresa a tu sucursal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input 
            label="Usuario" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Ej. admin"
          />
          <Input 
            label="Contraseña" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full mt-2">
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}