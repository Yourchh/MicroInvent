import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Inventory from './pages/Inventory';
import Users from './pages/Users';

// --- IMPORTAMOS LAS NUEVAS VISTAS ---
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Movements from './pages/Movements';
import Transfers from './pages/Transfers';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/" />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Rutas Hijas */}
        <Route index element={<Dashboard />} /> {/* Dashboard es la vista por defecto */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="movements" element={<Movements />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;