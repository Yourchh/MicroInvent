import { createContext, useState, useContext, useEffect } from 'react';
import client from '../api/axios';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, revisar si ya hay un token guardado
  useEffect(() => {
    const checkLogin = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Aquí podríamos validar el token con el backend, por ahora asumimos que es válido
        // Opcional: Decodificar el token para sacar el usuario si lo necesitas
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    checkLogin();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await client.post('/auth/login', { username, password });
      
      // Guardar token y datos del usuario
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setIsAuthenticated(true);
      return true; // Éxito
    } catch (error) {
      console.error(error);
      return false; // Falló
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};