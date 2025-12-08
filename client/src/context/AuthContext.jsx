import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

// 1. SOLUCIÓN ERROR ARRIBA: Agregamos esta línea para que Vite no se queje del Hook y el Componente juntos
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // 2. SOLUCIÓN ERROR ABAJO: "Lazy Initialization"
  // Leemos el localStorage DIRECTAMENTE al iniciar el estado.
  // Esto evita el useEffect y el re-renderizado innecesario.
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Si ya leímos el usuario arriba, no necesitamos "loading" para la carga inicial
  // (A menos que quieras validar el token con el backend al inicio)
  const [loading, setLoading] = useState(false);

  const login = async (username, password, userType) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password, userType });
      
      // Si requiere selección de sucursal, retornar tempToken
      if (data.requiresBranchSelection) {
        setLoading(false);
        return {
          success: true,
          requiresBranchSelection: true,
          tempToken: data.tempToken,
          user: data.user
        };
      }

      // Login directo (empleado)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión' 
      };
    }
  };

  const logout = async () => {
    try {
      // Intentar logout en el servidor
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Error en logout del servidor:', err.message);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};